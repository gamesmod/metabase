/* eslint-disable react/prop-types */
import React from "react";

const AdminContentTable = ({ columnTitles, children }) => (
  <table className="ContentTable" data-testid="admin-content-table">
    <thead>
      <tr>
        {columnTitles &&
          columnTitles.map((title, index) => <th key={index}>{title}</th>)}
      </tr>
    </thead>
    <tbody>{children}</tbody>
  </table>
);

export default AdminContentTable;
