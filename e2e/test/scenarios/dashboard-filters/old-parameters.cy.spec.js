import {
  restore,
  popover,
  visitDashboard,
  rightSidebar,
} from "e2e/support/helpers";
// NOTE: some overlap with parameters-embedded.cy.spec.js
import { SAMPLE_DATABASE } from "e2e/support/cypress_sample_database";

const { PEOPLE, PEOPLE_ID, PRODUCTS, PRODUCTS_ID } = SAMPLE_DATABASE;

// the dashboard parameters used in these tests ('category' and 'location/...') are no longer accessible
// via the UI but should still work as expected

describe("scenarios > dashboard > OLD parameters", () => {
  beforeEach(() => {
    restore();
    cy.signInAsAdmin();
  });

  describe("question connected to a 'category' parameter", () => {
    beforeEach(() => {
      const filter = {
        id: "c2967a17",
        name: "Category",
        slug: "category",
        type: "category",
      };

      const questionDetails = {
        name: "Products table",
        query: {
          "source-table": PRODUCTS_ID,
        },
      };

      const dashboardDetails = {
        parameters: [filter],
      };

      cy.createQuestionAndDashboard({ questionDetails, dashboardDetails }).then(
        ({ body: { id, card_id, dashboard_id } }) => {
          cy.request("PUT", `/api/dashboard/${dashboard_id}/cards`, {
            cards: [
              {
                id,
                card_id,
                row: 0,
                col: 0,
                size_x: 8,
                size_y: 6,
                parameter_mappings: [
                  {
                    card_id,
                    parameter_id: filter.id,
                    target: ["dimension", ["field", PRODUCTS.CATEGORY, null]],
                  },
                ],
              },
            ],
          });

          cy.intercept("PUT", `/api/card/${dashboard_id}`).as(
            "updateDashboard",
          );

          visitDashboard(dashboard_id);
        },
      );
    });

    it("should work", () => {
      cy.findAllByText("Doohickey");

      cy.contains("Category").click();
      popover().within(() => {
        cy.findByText("Gadget").click();
        cy.findByText("Add filter").click();
      });

      // verify that the filter is applied
      cy.findByText("Doohickey").should("not.exist");

      // Related to metabase#5332 and metabase#29267
      // Test that modifying dashboard doesn't wipe out parameter values (filters)
      openDashboardSidebar();
      cy.findByTestId("dashboard-parameters-widget-container").within(() => {
        cy.findByText("Gadget").should("be.visible");
      });
      rightSidebar().within(() => {
        cy.findByPlaceholderText("Add description")
          .click()
          .type("Please keep filter values 🥹")
          .blur();
      });
      cy.wait("@updateDashboard");
      cy.findByText("Gadget").should("be.visible");
    });
  });

  describe("question connected to a 'location/state' parameter", () => {
    beforeEach(() => {
      const filter = {
        id: "c2967a17",
        name: "City",
        slug: "city",
        type: "location/city",
      };

      const questionDetails = {
        name: "People table",
        query: {
          "source-table": PEOPLE_ID,
        },
      };

      const dashboardDetails = { parameters: [filter] };

      cy.createQuestionAndDashboard({ questionDetails, dashboardDetails }).then(
        ({ body: { id, card_id, dashboard_id } }) => {
          cy.request("PUT", `/api/dashboard/${dashboard_id}/cards`, {
            cards: [
              {
                id,
                card_id,
                row: 0,
                col: 0,
                size_x: 8,
                size_y: 6,
                parameter_mappings: [
                  {
                    card_id,
                    parameter_id: filter.id,
                    target: ["dimension", ["field", PEOPLE.CITY, null]],
                  },
                ],
              },
            ],
          });

          visitDashboard(dashboard_id);
        },
      );
    });

    it("should work", () => {
      cy.contains("City").click();
      popover().within(() => {
        cy.get("input").type("Flagstaff{enter}");
        cy.findByText("Add filter").click();
      });

      cy.get(".DashCard tbody tr").should("have.length", 1);
    });
  });

  describe("native question field filter connected to 'category' parameter", () => {
    beforeEach(() => {
      const filter = {
        id: "c2967a17",
        name: "Category",
        slug: "category",
        type: "category",
      };

      const questionDetails = {
        name: "Products SQL",
        native: {
          query: "select * from products where {{category}}",
          "template-tags": {
            category: {
              "display-name": "Field Filter",
              id: "abc123",
              name: "category",
              type: "dimension",
              "widget-type": "category",
              dimension: ["field", PRODUCTS.CATEGORY, null],
              default: ["Doohickey"],
            },
          },
        },
        display: "table",
      };

      const dashboardDetails = { parameters: [filter] };

      cy.createNativeQuestionAndDashboard({
        questionDetails,
        dashboardDetails,
      }).then(({ body: { id, card_id, dashboard_id } }) => {
        cy.request("PUT", `/api/dashboard/${dashboard_id}/cards`, {
          cards: [
            {
              id,
              card_id,
              row: 0,
              col: 0,
              size_x: 8,
              size_y: 6,
              parameter_mappings: [
                {
                  card_id,
                  parameter_id: "c2967a17",
                  target: ["dimension", ["field", PRODUCTS.CATEGORY, null]],
                },
              ],
            },
          ],
        });

        visitDashboard(dashboard_id);
      });
    });

    it("should work", () => {
      cy.findAllByText("Doohickey");

      cy.contains("Category").click();
      popover().within(() => {
        cy.findByText("Gadget").click();
        cy.findByText("Add filter").click();
      });

      // verify that the filter is applied
      cy.findByText("Doohickey").should("not.exist");
    });
  });
});

function openDashboardSidebar() {
  cy.get("main header").within(() => {
    cy.icon("info").click();
  });
}
