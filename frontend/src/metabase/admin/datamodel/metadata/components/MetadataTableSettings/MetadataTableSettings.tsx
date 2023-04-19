import React, { useCallback } from "react";
import { connect } from "react-redux";
import { t } from "ttag";
import _ from "underscore";
import { PLUGIN_FEATURE_LEVEL_PERMISSIONS } from "metabase/plugins";
import * as Urls from "metabase/lib/urls";
import Databases from "metabase/entities/databases";
import Tables from "metabase/entities/tables";
import Schemas from "metabase/entities/schemas";
import ActionButton from "metabase/components/ActionButton";
import Breadcrumbs from "metabase/components/Breadcrumbs";
import { Database, Schema, Table, TableId } from "metabase-types/api";
import { State } from "metabase-types/store";
import { discardTableFieldValues, rescanTableFieldValues } from "../../actions";
import MetadataSection from "../MetadataSection";
import MetadataSectionHeader from "../MetadataSectionHeader";
import MetadataBackButton from "../MetadataBackButton";

interface RouteParams {
  databaseId: string;
  schemaName: string;
  tableId: string;
}

interface RouterProps {
  params: RouteParams;
}

interface DatabaseLoaderProps {
  database: Database;
}

interface SchemaLoaderProps {
  schemas: Schema[];
}

interface TableLoaderProps {
  table: Table;
}

interface DispatchProps {
  onRescanTableFieldValues: (tableId: TableId) => void;
  onDiscardTableFieldValues: (tableId: TableId) => void;
}

const mapDispatchToProps: DispatchProps = {
  onRescanTableFieldValues: rescanTableFieldValues,
  onDiscardTableFieldValues: discardTableFieldValues,
};

type MetadataTableSettingsProps = RouterProps &
  DatabaseLoaderProps &
  SchemaLoaderProps &
  TableLoaderProps &
  DispatchProps;

const MetadataTableSettings = ({
  database,
  schemas,
  table,
  params: { schemaName },
  onRescanTableFieldValues,
  onDiscardTableFieldValues,
}: MetadataTableSettingsProps) => {
  const handleRescanTableFieldValues = useCallback(async () => {
    await onRescanTableFieldValues(table.id);
  }, [table, onRescanTableFieldValues]);

  const handleDiscardTableFieldValues = useCallback(async () => {
    await onDiscardTableFieldValues(table.id);
  }, [table, onDiscardTableFieldValues]);

  return (
    <div className="relative">
      <div className="wrapper wrapper--trim">
        <div className="flex align-center my2">
          <MetadataBackButton
            selectedDatabaseId={database.id}
            selectedSchemaName={schemaName}
            selectedTableId={table.id}
          />
          <div className="my4 py1 ml2">
            <Breadcrumbs
              crumbs={[
                [database.name, Urls.dataModelDatabase(database.id)],
                ...(schemas.length > 1
                  ? [schemaName, Urls.dataModelSchema(database.id, schemaName)]
                  : []),
                [
                  table.display_name,
                  Urls.dataModelTable(database.id, schemaName, table.id),
                ],
                t`Settings`,
              ]}
            />
          </div>
        </div>
        <MetadataSection>
          <MetadataSectionHeader
            title={t`Cached field values`}
            description={t`Metabase can scan the values in this table to enable checkbox filters in dashboards and questions.`}
          />
          <ActionButton
            className="Button mr2"
            actionFn={handleRescanTableFieldValues}
            normalText={t`Re-scan this table`}
            activeText={t`Starting…`}
            failedText={t`Failed to start scan`}
            successText={t`Scan triggered!`}
          />
          <ActionButton
            className="Button Button--danger"
            actionFn={handleDiscardTableFieldValues}
            normalText={t`Discard cached field values`}
            activeText={t`Starting…`}
            failedText={t`Failed to discard values`}
            successText={t`Discard triggered!`}
          />
        </MetadataSection>
      </div>
    </div>
  );
};

export default _.compose(
  Databases.load({
    id: (_: State, { params }: RouterProps) =>
      Urls.extractEntityId(params.databaseId),
    query: {
      ...PLUGIN_FEATURE_LEVEL_PERMISSIONS.dataModelQueryProps,
    },
  }),
  Schemas.loadList({
    query: (_: State, { database }: DatabaseLoaderProps) => ({
      dbId: database.id,
    }),
  }),
  Tables.load({
    id: (_: State, { params }: RouterProps) =>
      Urls.extractEntityId(params.tableId),
    query: {
      ...PLUGIN_FEATURE_LEVEL_PERMISSIONS.dataModelQueryProps,
    },
    selectorName: "getObjectUnfiltered",
  }),
  connect(null, mapDispatchToProps),
)(MetadataTableSettings);
