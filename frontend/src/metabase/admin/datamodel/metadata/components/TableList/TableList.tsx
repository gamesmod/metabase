import React, {
  ChangeEvent,
  MouseEvent,
  useCallback,
  useMemo,
  useState,
} from "react";
import { connect } from "react-redux";
import { push } from "react-router-redux";
import { useAsyncFn } from "react-use";
import cx from "classnames";
import { msgid, ngettext, t } from "ttag";
import _ from "underscore";
import * as Urls from "metabase/lib/urls";
import Tables from "metabase/entities/tables";
import Icon from "metabase/components/Icon/Icon";
import IconButtonWrapper from "metabase/components/IconButtonWrapper";
import Tooltip from "metabase/core/components/Tooltip";
import {
  DatabaseId,
  Table,
  TableId,
  TableVisibilityType,
} from "metabase-types/api";
import { Dispatch, State } from "metabase-types/store";

interface OwnProps {
  selectedDatabaseId: DatabaseId;
  selectedSchemaName: string;
  selectedTableId?: TableId;
  canGoBack: boolean;
}

interface TableLoaderProps {
  tables: Table[];
}

interface DispatchProps {
  onSelectDatabase: (databaseId: DatabaseId) => void;
  onSelectTable: (
    databaseId: DatabaseId,
    schemaName: string,
    tableId: TableId,
  ) => void;
  onUpdateTableVisibility: (
    tables: Table[],
    visibility: TableVisibilityType,
  ) => Promise<void>;
}

type TableListProps = OwnProps & TableLoaderProps & DispatchProps;

const mapDispatchToProps = (dispatch: Dispatch): DispatchProps => ({
  onSelectDatabase: databaseId =>
    dispatch(push(Urls.dataModelDatabase(databaseId))),
  onSelectTable: (databaseId, schemaName, tableId) =>
    dispatch(push(Urls.dataModelTable(databaseId, schemaName, tableId))),
  onUpdateTableVisibility: async (tables, visibility) =>
    dispatch(
      Tables.actions.bulkUpdate({
        ids: tables.map(table => table.id),
        visibility_type: visibility,
      }),
    ),
});

const TableList = ({
  tables: allTables,
  selectedDatabaseId,
  selectedSchemaName,
  selectedTableId,
  canGoBack,
  onSelectDatabase,
  onSelectTable,
  onUpdateTableVisibility,
}: TableListProps) => {
  const [searchText, setSearchText] = useState("");

  const [hiddenTables, visibleTables] = useMemo(() => {
    const searchValue = searchText.toLowerCase();

    return _.chain(allTables)
      .filter(table => table.display_name.toLowerCase().includes(searchValue))
      .sortBy(table => table.display_name)
      .partition(table => table.visibility_type != null)
      .value();
  }, [allTables, searchText]);

  const handleSelectTable = useCallback(
    (tableId: TableId) => {
      onSelectTable(selectedDatabaseId, selectedSchemaName, tableId);
    },
    [selectedDatabaseId, selectedSchemaName, onSelectTable],
  );

  const handleSelectDatabase = useCallback(() => {
    onSelectDatabase(selectedDatabaseId);
  }, [selectedDatabaseId, onSelectDatabase]);

  return (
    <div className="MetadataEditor-table-list AdminList flex-no-shrink">
      <TableSearch searchText={searchText} onChangeSearchText={setSearchText} />
      {canGoBack && (
        <TableBreadcrumbs
          schemaName={selectedSchemaName}
          onBack={handleSelectDatabase}
        />
      )}
      <ul className="AdminList-items">
        {visibleTables.length > 0 && (
          <TableHeader
            tables={visibleTables}
            isHidden={false}
            onUpdateTableVisibility={onUpdateTableVisibility}
          />
        )}
        {visibleTables.map(table => (
          <TableRow
            key={table.id}
            table={table}
            isSelected={table.id === selectedTableId}
            onSelectTable={handleSelectTable}
            onUpdateTableVisibility={onUpdateTableVisibility}
          />
        ))}
        {hiddenTables.length > 0 && (
          <TableHeader
            tables={hiddenTables}
            isHidden={true}
            onUpdateTableVisibility={onUpdateTableVisibility}
          />
        )}
        {hiddenTables.map(table => (
          <TableRow
            key={table.id}
            table={table}
            isSelected={table.id === selectedTableId}
            onSelectTable={handleSelectTable}
            onUpdateTableVisibility={onUpdateTableVisibility}
          />
        ))}
        {visibleTables.length === 0 && hiddenTables.length === 0 && (
          <TableEmptyState />
        )}
      </ul>
    </div>
  );
};

interface TableSearchProps {
  searchText: string;
  onChangeSearchText: (searchText: string) => void;
}

const TableSearch = ({ searchText, onChangeSearchText }: TableSearchProps) => {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChangeSearchText(event.target.value);
    },
    [onChangeSearchText],
  );

  return (
    <div className="AdminList-search">
      <Icon name="search" size={16} />
      <input
        className="AdminInput pl4 border-bottom"
        type="text"
        placeholder={t`Find a table`}
        value={searchText}
        onChange={handleChange}
      />
    </div>
  );
};

interface TableBreadcrumbsProps {
  schemaName: string;
  onBack: () => void;
}

const TableBreadcrumbs = ({ schemaName, onBack }: TableBreadcrumbsProps) => {
  return (
    <h4 className="p2 border-bottom break-anywhere">
      <span className="text-brand cursor-pointer" onClick={onBack}>
        <Icon name="chevronleft" size={10} />
        {t`Schemas`}
      </span>
      <span className="mx1">-</span>
      <span>{schemaName}</span>
    </h4>
  );
};

interface TableHeaderProps {
  tables: Table[];
  isHidden: boolean;
  onUpdateTableVisibility: (
    tables: Table[],
    visibility: TableVisibilityType,
  ) => Promise<void>;
}

const TableHeader = ({
  tables,
  isHidden,
  onUpdateTableVisibility,
}: TableHeaderProps) => {
  const title = isHidden
    ? ngettext(
        msgid`${tables.length} Queryable Table`,
        `${tables.length} Queryable Tables`,
        tables.length,
      )
    : ngettext(
        msgid`${tables.length} Queryable Table`,
        `${tables.length} Queryable Tables`,
        tables.length,
      );

  return (
    <li className="AdminList-section flex justify-between align-center">
      {title}
      <ToggleVisibilityButton
        tables={tables}
        isHidden={isHidden}
        onUpdateTableVisibility={onUpdateTableVisibility}
      />
    </li>
  );
};

const TableEmptyState = () => {
  return <li className="AdminList-section">{t`0 Tables`}</li>;
};

interface TableRowProps {
  table: Table;
  isSelected: boolean;
  onSelectTable: (tableId: TableId) => void;
  onUpdateTableVisibility: (
    tables: Table[],
    visibility: TableVisibilityType,
  ) => Promise<void>;
}

const TableRow = ({
  table,
  isSelected,
  onSelectTable,
  onUpdateTableVisibility,
}: TableRowProps) => {
  const tables = useMemo(() => {
    return [table];
  }, [table]);

  const handleSelect = useCallback(() => {
    onSelectTable(table.id);
  }, [table, onSelectTable]);

  return (
    <li className="hover-parent hover--visibility">
      <a
        className={cx(
          "AdminList-item flex align-center no-decoration text-wrap justify-between",
          { selected: isSelected },
        )}
        onClick={handleSelect}
      >
        {table.display_name}
        <div className="hover-child float-right">
          <ToggleVisibilityButton
            tables={tables}
            isHidden={table.visibility_type != null}
            onUpdateTableVisibility={onUpdateTableVisibility}
          />
        </div>
      </a>
    </li>
  );
};

interface ToggleVisibilityButtonProps {
  tables: Table[];
  isHidden: boolean;
  onUpdateTableVisibility: (
    tables: Table[],
    visibility: TableVisibilityType,
  ) => Promise<void>;
}

const ToggleVisibilityButton = ({
  tables,
  isHidden,
  onUpdateTableVisibility,
}: ToggleVisibilityButtonProps) => {
  const hasMultipleTables = tables.length > 1;
  const [{ loading }, handleUpdate] = useAsyncFn(onUpdateTableVisibility);

  const handleClick = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      handleUpdate(tables, isHidden ? null : "hidden");
    },
    [tables, isHidden, handleUpdate],
  );

  return (
    <Tooltip tooltip={getToggleTooltip(isHidden, hasMultipleTables)}>
      <IconButtonWrapper
        className={cx(
          "float-right",
          loading ? "cursor-not-allowed" : "brand-hover",
        )}
        disabled={loading}
        onClick={handleClick}
      >
        <Icon name={isHidden ? "eye" : "eye_crossed_out"} size={18} />
      </IconButtonWrapper>
    </Tooltip>
  );
};

const getToggleTooltip = (isHidden: boolean, hasMultipleTables?: boolean) => {
  if (hasMultipleTables) {
    return isHidden ? t`Unhide all` : t`Hide all`;
  } else {
    return isHidden ? t`Unhide` : t`Hide`;
  }
};

export default _.compose(
  Tables.loadList({
    query: (
      _: State,
      { selectedDatabaseId, selectedSchemaName }: OwnProps,
    ) => ({
      dbId: selectedDatabaseId,
      schemaName: selectedSchemaName,
    }),
  }),
  connect(null, mapDispatchToProps),
)(TableList);
