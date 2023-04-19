/* eslint-disable react/prop-types */
import React, { Component } from "react";
import PropTypes from "prop-types";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { t } from "ttag";

import Form, { FormField, FormFooter } from "metabase/containers/FormikForm";
import ModalContent from "metabase/components/ModalContent";
import Radio from "metabase/core/components/Radio";
import validate from "metabase/lib/validate";
import { canonicalCollectionId } from "metabase/collections/utils";

import "./SaveQuestionModal.css";

const getSingleStepTitle = (questionType: string, showSaveType: boolean) => {
  if (questionType === "model") {
    return t`Save model`;
  } else if (showSaveType) {
    return t`Save question`;
  }

  return t`Save new question`;
};

interface SaveQuestionModalProps {
  question: any;
  originalQuestion?: any;
  onCreate: (question: any) => void;
  onSave: (question: any) => void;
  onClose: () => void;
  multiStep?: boolean;
  initialCollectionId: any;
}

export default class SaveQuestionModal extends Component<SaveQuestionModalProps> {
  static propTypes = {
    question: PropTypes.object.isRequired,
    originalQuestion: PropTypes.object,
    onCreate: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    multiStep: PropTypes.bool,
  };

  validateName = (name: any, { values }: any) => {
    if (values.saveType !== "overwrite") {
      // We don't care if the form is valid when overwrite mode is enabled,
      // as original question's data will be submitted instead of the form values
      return validate.required()(name);
    }
  };

  handleSubmit = async (details: {
    saveType: string;
    collection_id: string | number | null | undefined;
    name: string;
    description: string;
  }) => {
    const { question, originalQuestion, onCreate, onSave } = this.props;

    const collectionId = canonicalCollectionId(
      details.saveType === "overwrite"
        ? originalQuestion.collectionId()
        : details.collection_id,
    );
    const displayName =
      details.saveType === "overwrite"
        ? originalQuestion.displayName()
        : details.name.trim();
    const description =
      details.saveType === "overwrite"
        ? originalQuestion.description()
        : details.description
        ? details.description.trim()
        : null;

    const newQuestion = question
      .setDisplayName(displayName)
      .setDescription(description)
      .setCollectionId(collectionId);

    if (details.saveType === "create") {
      await onCreate(newQuestion);
    } else if (details.saveType === "overwrite") {
      await onSave(newQuestion.setId(originalQuestion.id()));
    }
  };

  render() {
    const { question, originalQuestion, initialCollectionId } = this.props;

    const isReadonly = originalQuestion != null && !originalQuestion.canWrite();

    const initialValues = {
      name: question.generateQueryDescription(),
      description: question.description() || "",
      collection_id:
        question.collectionId() === undefined || isReadonly
          ? initialCollectionId
          : question.collectionId(),
      saveType:
        originalQuestion &&
        !originalQuestion.isDataset() &&
        originalQuestion.canWrite()
          ? "overwrite"
          : "create",
    };

    const questionType = question.isDataset() ? "model" : "question";

    const multiStepTitle =
      questionType === "question"
        ? t`First, save your question`
        : t`First, save your model`;

    const showSaveType =
      !question.isSaved() &&
      !!originalQuestion &&
      !originalQuestion.isDataset() &&
      originalQuestion.canWrite();

    const singleStepTitle = getSingleStepTitle(questionType, showSaveType);

    const title = this.props.multiStep ? multiStepTitle : singleStepTitle;

    const nameInputPlaceholder =
      questionType === "question"
        ? t`What is the name of your question?`
        : t`What is the name of your model?`;

    return (
      <ModalContent
        id="SaveQuestionModal"
        title={title}
        onClose={this.props.onClose}
      >
        <Form
          initialValues={initialValues}
          fields={[
            { name: "saveType" },
            {
              name: "name",
              // @ts-expect-error provide correct types for validator
              validate: this.validateName,
            },
            { name: "description" },
            { name: "collection_id" },
          ]}
          onSubmit={this.handleSubmit}
          overwriteOnInitialValuesChange
        >
          {({ values, Form }) => (
            <Form>
              <FormField
                name="saveType"
                title={t`Replace or save as new?`}
                // @ts-expect-error old type
                type={SaveTypeInput}
                hidden={!showSaveType}
                originalQuestion={originalQuestion}
              />
              <TransitionGroup>
                {values.saveType === "create" && (
                  <CSSTransition
                    classNames="saveQuestionModalFields"
                    timeout={{
                      enter: 500,
                      exit: 500,
                    }}
                  >
                    <div className="saveQuestionModalFields">
                      <FormField
                        autoFocus
                        name="name"
                        title={t`Name`}
                        placeholder={nameInputPlaceholder}
                      />
                      <FormField
                        name="description"
                        type="text"
                        title={t`Description`}
                        placeholder={t`It's optional but oh, so helpful`}
                      />
                      <FormField
                        name="collection_id"
                        title={t`Which collection should this go in?`}
                        type="collection"
                      />
                    </div>
                  </CSSTransition>
                )}
              </TransitionGroup>
              <FormFooter submitTitle={t`Save`} onCancel={this.props.onClose} />
            </Form>
          )}
        </Form>
      </ModalContent>
    );
  }
}

interface SaveTypeInputProps {
  field: any;
  originalQuestion: any;
}

const SaveTypeInput = ({ field, originalQuestion }: SaveTypeInputProps) => (
  <Radio
    {...field}
    type={""}
    options={[
      {
        name: t`Replace original question, "${
          originalQuestion && originalQuestion.displayName()
        }"`,
        value: "overwrite",
      },
      { name: t`Save as new question`, value: "create" },
    ]}
    vertical
  />
);