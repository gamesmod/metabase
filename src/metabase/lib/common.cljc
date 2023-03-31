(ns metabase.lib.common
  (:require
   [metabase.lib.dispatch :as lib.dispatch]
   [metabase.lib.field :as lib.field]
   [metabase.lib.hierarchy :as lib.hierarchy]
   [metabase.lib.options :as lib.options]
   [metabase.lib.schema.common :as schema.common]
   [metabase.util.malli :as mu])
  #?(:cljs (:require-macros [metabase.lib.common])))

(comment lib.options/keep-me
         mu/keep-me)

(mu/defn external-op :- [:maybe ::schema.common/external-op]
  "Convert the internal operator `clause` to the external format."
  [[operator options :as clause]]
  (when clause
    {:operator (cond-> operator
                 (keyword? operator) name)
     :options options
     :args (subvec clause 2)}))

(defmulti ->op-arg
  "Ensures that clause arguments are properly unwrapped"
  {:arglists '([query stage-number x])}
  (fn [_query _stage-number x]
    (lib.dispatch/dispatch-value x))
  :hierarchy lib.hierarchy/hierarchy)

(defmethod ->op-arg :default
  [_query _stage-number x]
  x)

(defmethod ->op-arg :metadata/field
  [query stage-number field-metadata]
  (lib.field/field query stage-number field-metadata))

(defmethod ->op-arg :lib/external-op
  [query stage-number {:keys [operator options args] :or {options {}}}]
  (->op-arg query stage-number (lib.options/ensure-uuid (into [(keyword operator) options] args))))

(defmethod ->op-arg :dispatch-type/fn
  [query stage-number f]
  (->op-arg query stage-number (f query stage-number)))

#?(:clj
   (defn- fn-rename [fn-name]
     (name (get {'/ 'div} fn-name fn-name))))

#?(:clj
   (defmacro -defop-define-op-clause-fn
     "Helper for [[defop]]; define the `<op>-clause` function."
     [op-name argvecs]
     `(mu/defn ~(symbol (str (fn-rename op-name) "-clause")) :- :metabase.lib.schema.common/external-op
        ~(format "Create a standalone clause of type `%s`." (name op-name))
        ~@(for [argvec argvecs
                :let   [arglist-expr (if (contains? (set argvec) '&)
                                     (cons `list* (remove (partial = '&) argvec))
                                     argvec)]]
            `([~'query ~'stage-number ~@argvec]
              {:operator ~(keyword op-name)
               :args     (mapv (fn [~'arg]
                             (->op-arg ~'query ~'stage-number ~'arg))
                           ~arglist-expr)})))))

#?(:clj
   (defmacro -defop-define-op-fn
     "Helper for [[defop]]; define the `<op>` function."
     [op-name argvecs]
     `(mu/defn ~op-name :- fn?
        ~(format "Create a closure of clause of type `%s`." (name op-name))
        ~@(for [argvec argvecs
                :let   [varargs? (contains? (set argvec) '&)
                        arglist-expr (if varargs?
                                       (filterv (partial not= '&) argvec)
                                       argvec)]]
            `([~@argvec]
              (fn ~(symbol (str (fn-rename op-name) "-closure"))
                [~'query ~'stage-number]
                ~(cond->> (concat [(symbol (str (fn-rename op-name) "-clause")) 'query 'stage-number]
                                  arglist-expr)
                   varargs? (cons `apply))))))))

#?(:clj
   (defmacro defop
     "Defines a clause creating function with given args.
      Calling the clause without query and stage produces a fn that can be resolved later."
     [op-name & argvecs]
     {:pre [(symbol? op-name)
            (every? vector? argvecs) (every? #(every? symbol? %) argvecs)
            (every? #(not-any? #{'query 'stage-number} %) argvecs)]}
     `(do
        (-defop-define-op-clause-fn ~op-name ~argvecs)
        (-defop-define-op-fn ~op-name ~argvecs))))
