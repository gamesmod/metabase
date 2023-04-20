import React, { useEffect } from "react";
import { connect } from "react-redux";
import { Link } from "react-router";
import { push } from "react-router-redux";
import _ from "underscore";
import { PLUGIN_FEATURE_LEVEL_PERMISSIONS } from "metabase/plugins";
import * as Urls from "metabase/lib/urls";
import Databases from "metabase/entities/databases";
import Icon from "metabase/components/Icon/Icon";
import { DatabaseDataSelector } from "metabase/query_builder/components/DataSelector";
import { DatabaseId, TableId } from "metabase-types/api";
import { Dispatch } from "metabase-types/store";
import Database from "metabase-lib/metadata/Database";

interface OwnProps {
  selectedDatabaseId?: DatabaseId;
  selectedSchemaName?: string;
  selectedTableId?: TableId;
}

interface DatabaseLoaderProps {
  databases: Database[];
}

interface DispatchProps {
  onSelectDatabase: (databaseId: DatabaseId) => void;
}

const mapDispatchToProps = (dispatch: Dispatch): DispatchProps => ({
  onSelectDatabase: databaseId =>
    dispatch(push(Urls.dataModelDatabase(databaseId))),
});

type MetadataHeaderProps = OwnProps & DatabaseLoaderProps & DispatchProps;

const MetadataHeader = ({
  databases,
  selectedDatabaseId,
  selectedSchemaName,
  selectedTableId,
  onSelectDatabase,
}: MetadataHeaderProps) => {
  useEffect(() => {
    if (databases.length > 0 && selectedDatabaseId == null) {
      onSelectDatabase(databases[0].id);
    }
  }, [databases, selectedDatabaseId, onSelectDatabase]);

  return (
    <div className="MetadataEditor-header flex align-center flex-no-shrink pb2">
      <Icon
        className="flex align-center flex-no-shrink text-medium"
        name="database"
      />
      <div className="MetadataEditor-headerSection h2">
        <DatabaseDataSelector
          databases={databases}
          selectedDatabaseId={selectedDatabaseId}
          setDatabaseFn={onSelectDatabase}
          style={{ padding: 0, paddingLeft: 8 }}
        />
      </div>
      {selectedDatabaseId && selectedSchemaName && selectedTableId && (
        <div className="MetadataEditor-headerSection flex flex-align-right align-center flex-no-shrink">
          <span className="ml4 mr3">
            <Link
              to={Urls.dataModelTableSettings(
                selectedDatabaseId,
                selectedSchemaName,
                selectedTableId,
              )}
            >
              <Icon name="gear" className="text-brand-hover" />
            </Link>
          </span>
        </div>
      )}
    </div>
  );
};

export default _.compose(
  Databases.loadList({
    query: {
      ...PLUGIN_FEATURE_LEVEL_PERMISSIONS.dataModelQueryProps,
    },
  }),
  connect(null, mapDispatchToProps),
)(MetadataHeader);