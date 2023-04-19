/* eslint-disable react/prop-types */
import React from "react";
import { connect } from "react-redux";

import { t } from "ttag";
import _ from "underscore";

import Questions from "metabase/entities/questions";
import { ROOT_COLLECTION } from "metabase/entities/collections";

import { MODAL_TYPES } from "metabase/query_builder/constants";

import Modal from "metabase/components/Modal";

import SaveQuestionModal from "metabase/containers/SaveQuestionModal";
import QuestionSavedModal from "metabase/components/QuestionSavedModal";
import AddToDashSelectDashModal from "metabase/containers/AddToDashSelectDashModal";

import CollectionMoveModal from "metabase/containers/CollectionMoveModal";
import ArchiveQuestionModal from "metabase/questions/containers/ArchiveQuestionModal";
import QuestionEmbedWidget from "metabase/query_builder/containers/QuestionEmbedWidget";

import { CreateAlertModalContent } from "metabase/query_builder/components/AlertModals";
import { ImpossibleToCreateModelModal } from "metabase/query_builder/components/ImpossibleToCreateModelModal";
import NewDatasetModal from "metabase/query_builder/components/NewDatasetModal";
import EntityCopyModal from "metabase/entities/containers/EntityCopyModal";
import BulkFilterModal from "metabase/query_builder/components/filters/modals/BulkFilterModal";
import NewEventModal from "metabase/timelines/questions/containers/NewEventModal";
import EditEventModal from "metabase/timelines/questions/containers/EditEventModal";
import MoveEventModal from "metabase/timelines/questions/containers/MoveEventModal";
import PreviewQueryModal from "metabase/query_builder/components/view/PreviewQueryModal";
import ConvertQueryModal from "metabase/query_builder/components/view/ConvertQueryModal";
import QuestionMoveToast from "metabase/questions/components/QuestionMoveToast";
import { Card, Collection, User } from "metabase-types/api";
import StructuredQuery from "metabase-lib/queries/StructuredQuery";
import Question from "metabase-lib/Question";

const mapDispatchToProps = {
  setQuestionCollection: Questions.actions.setCollection,
};

// TODO: choose a better name
type _Modal = typeof MODAL_TYPES[keyof typeof MODAL_TYPES];

interface QueryModalsProps {
  questionAlerts: any;
  user: User;
  modal: _Modal;
  modalContext: number;
  question: Question;
  initialCollectionId: number;
  updateQuestion: (question: Question, config?: object) => void;
  setQueryBuilderMode: (mode: string) => void;
  originalQuestion: Question;
  card: Card;
  onCreate: (question: Question, flag?: boolean) => void;
  onSave: (question: Question, flag?: boolean) => void;
  onCloseModal: () => void;
  onOpenModal: (modal: _Modal) => void;
  onChangeLocation: (location: string) => void;
  setQuestionCollection: (
    { id }: Collection,
    collection: Collection,
    opts: Record<string, unknown>,
  ) => void;
}

class QueryModals extends React.Component<QueryModalsProps> {
  showAlertsAfterQuestionSaved = () => {
    const { questionAlerts, user, onCloseModal, onOpenModal } = this.props;

    const hasAlertsCreatedByCurrentUser = _.any(
      questionAlerts,
      alert => alert.creator.id === user.id,
    );

    if (hasAlertsCreatedByCurrentUser) {
      // TODO Atte Keinänen 11/10/17: The question was replaced and there is already an alert created by current user.
      // Should we show pop up the alerts list in this case or do nothing (as we do currently)?
      onCloseModal();
    } else {
      // HACK: in a timeout because save modal closes itself
      setTimeout(() => onOpenModal(MODAL_TYPES.CREATE_ALERT));
    }
  };

  onQueryChange = (query: StructuredQuery) => {
    const question = query.question();
    this.props.updateQuestion(question, { run: true });
  };

  render() {
    const {
      modal,
      modalContext,
      question,
      initialCollectionId,
      onCloseModal,
      onOpenModal,
      updateQuestion,
      setQueryBuilderMode,
    } = this.props;

    return modal === MODAL_TYPES.SAVE ? (
      <Modal form onClose={onCloseModal}>
        <SaveQuestionModal
          question={this.props.question}
          originalQuestion={this.props.originalQuestion}
          initialCollectionId={this.props.initialCollectionId}
          onSave={async (question: any) => {
            // if saving modified question, don't show "add to dashboard" modal
            await this.props.onSave(question);
            onCloseModal();
          }}
          onCreate={async question => {
            await this.props.onCreate(question);
            if (question.isDataset()) {
              onCloseModal();
              setQueryBuilderMode("view");
            } else {
              onOpenModal(MODAL_TYPES.SAVED);
            }
          }}
          onClose={onCloseModal}
        />
      </Modal>
    ) : modal === MODAL_TYPES.SAVED ? (
      <Modal small onClose={onCloseModal}>
        <QuestionSavedModal
          onClose={onCloseModal}
          addToDashboard={() => {
            onOpenModal(MODAL_TYPES.ADD_TO_DASHBOARD);
          }}
        />
      </Modal>
    ) : modal === MODAL_TYPES.ADD_TO_DASHBOARD_SAVE ? (
      <Modal onClose={onCloseModal}>
        <SaveQuestionModal
          question={this.props.question}
          originalQuestion={this.props.originalQuestion}
          initialCollectionId={this.props.initialCollectionId}
          onSave={async question => {
            await this.props.onSave(question);
            onOpenModal(MODAL_TYPES.ADD_TO_DASHBOARD);
          }}
          onCreate={async question => {
            await this.props.onCreate(question);
            onOpenModal(MODAL_TYPES.ADD_TO_DASHBOARD);
          }}
          onClose={onCloseModal}
          multiStep
        />
      </Modal>
    ) : modal === MODAL_TYPES.ADD_TO_DASHBOARD ? (
      <Modal onClose={onCloseModal}>
        <AddToDashSelectDashModal
          card={this.props.card}
          onClose={onCloseModal}
          onChangeLocation={this.props.onChangeLocation}
        />
      </Modal>
    ) : modal === MODAL_TYPES.CREATE_ALERT ? (
      <Modal full onClose={onCloseModal}>
        <CreateAlertModalContent
          onCancel={onCloseModal}
          onAlertCreated={onCloseModal}
        />
      </Modal>
    ) : modal === MODAL_TYPES.SAVE_QUESTION_BEFORE_ALERT ? (
      <Modal onClose={onCloseModal}>
        <SaveQuestionModal
          question={this.props.question}
          originalQuestion={this.props.originalQuestion}
          onSave={async question => {
            await this.props.onSave(question, false);
            this.showAlertsAfterQuestionSaved();
          }}
          onCreate={async question => {
            await this.props.onCreate(question, false);
            this.showAlertsAfterQuestionSaved();
          }}
          onClose={onCloseModal}
          multiStep
          initialCollectionId={this.props.initialCollectionId}
        />
      </Modal>
    ) : modal === MODAL_TYPES.SAVE_QUESTION_BEFORE_EMBED ? (
      <Modal onClose={onCloseModal}>
        <SaveQuestionModal
          question={this.props.question}
          originalQuestion={this.props.originalQuestion}
          onSave={async question => {
            await this.props.onSave(question, false);
            onOpenModal(MODAL_TYPES.EMBED);
          }}
          onCreate={async question => {
            await this.props.onCreate(question, false);
            onOpenModal(MODAL_TYPES.EMBED);
          }}
          onClose={onCloseModal}
          multiStep
          initialCollectionId={this.props.initialCollectionId}
        />
      </Modal>
    ) : modal === MODAL_TYPES.FILTERS ? (
      <Modal fit onClose={onCloseModal}>
        <BulkFilterModal
          question={question}
          onQueryChange={this.onQueryChange}
          onClose={onCloseModal}
        />
      </Modal>
    ) : modal === MODAL_TYPES.MOVE ? (
      <Modal onClose={onCloseModal}>
        <CollectionMoveModal
          title={t`Which collection should this be in?`}
          initialCollectionId={question.collectionId()}
          onClose={onCloseModal}
          onMove={(collection: Collection) => {
            this.props.setQuestionCollection(
              // @ts-expect-error question id has a different type from collection
              { id: question.id() },
              collection,
              {
                notify: {
                  message: (
                    <QuestionMoveToast
                      isModel={question.isDataset()}
                      collectionId={collection.id || ROOT_COLLECTION.id}
                    />
                  ),
                  undo: false,
                },
              },
            );
            onCloseModal();
          }}
        />
      </Modal>
    ) : modal === MODAL_TYPES.ARCHIVE ? (
      <Modal onClose={onCloseModal}>
        <ArchiveQuestionModal question={question} onClose={onCloseModal} />
      </Modal>
    ) : modal === MODAL_TYPES.EMBED ? (
      <Modal full onClose={onCloseModal}>
        <QuestionEmbedWidget card={this.props.card} onClose={onCloseModal} />
      </Modal>
    ) : modal === MODAL_TYPES.CLONE ? (
      <Modal onClose={onCloseModal}>
        <EntityCopyModal
          entityType="questions"
          entityObject={{
            ...question.card(),
            collection_id: question.canWrite()
              ? question.collectionId()
              : initialCollectionId,
          }}
          copy={async (formValues: {
            name: any;
            collection_id: any;
            description: any;
          }) => {
            const object = await this.props.onCreate(
              question
                .setDisplayName(formValues.name)
                .setCollectionId(formValues.collection_id)
                .setDescription(formValues.description || null),
            );
            return { payload: { object } };
          }}
          onClose={onCloseModal}
          onSaved={() => onOpenModal(MODAL_TYPES.SAVED)}
        />
      </Modal>
    ) : modal === MODAL_TYPES.TURN_INTO_DATASET ? (
      <Modal small onClose={onCloseModal}>
        <NewDatasetModal onClose={onCloseModal} />
      </Modal>
    ) : modal === MODAL_TYPES.CAN_NOT_CREATE_MODEL ? (
      <Modal onClose={onCloseModal}>
        <ImpossibleToCreateModelModal onClose={onCloseModal} />
      </Modal>
    ) : modal === MODAL_TYPES.NEW_EVENT ? (
      <Modal onClose={onCloseModal}>
        <NewEventModal
          cardId={question.id()}
          collectionId={question.collectionId()}
          onClose={onCloseModal}
        />
      </Modal>
    ) : modal === MODAL_TYPES.EDIT_EVENT ? (
      <Modal onClose={onCloseModal}>
        <EditEventModal eventId={modalContext} onClose={onCloseModal} />
      </Modal>
    ) : modal === MODAL_TYPES.MOVE_EVENT ? (
      <Modal onClose={onCloseModal}>
        <MoveEventModal
          eventId={modalContext}
          collectionId={question.collectionId()}
          onClose={onCloseModal}
        />
      </Modal>
    ) : modal === MODAL_TYPES.PREVIEW_QUERY ? (
      <Modal fit onClose={onCloseModal}>
        <PreviewQueryModal onClose={onCloseModal} />
      </Modal>
    ) : modal === MODAL_TYPES.CONVERT_QUERY ? (
      <Modal fit onClose={onCloseModal}>
        <ConvertQueryModal
          onUpdateQuestion={updateQuestion}
          onClose={onCloseModal}
        />
      </Modal>
    ) : null;
  }
}

export default connect(null, mapDispatchToProps)(QueryModals);
