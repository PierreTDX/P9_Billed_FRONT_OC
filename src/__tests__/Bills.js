/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom"
import BillsUI from "../views/BillsUI.js"
import { bills } from "../fixtures/bills.js"
import { ROUTES_PATH } from "../constants/routes.js"
import { localStorageMock } from "../__mocks__/localStorage.js"
import Bills from '../containers/Bills.js' // NewTest
import userEvent from "@testing-library/user-event" // NewTest
import mockStore from "../__mocks__/store" // NewTest

import router from "../app/Router.js"

jest.mock("../app/Store", () => mockStore) // NewTest

describe("Given I am connected as an employee", () => {

  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {

      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByTestId('icon-window'))
      const windowIcon = screen.getByTestId('icon-window')
      //to-do write expect expression
      expect(windowIcon.classList.contains('active-icon')).toBe(true) // NewTest

    })
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills })
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
      const antiChrono = (a, b) => ((a < b) ? 1 : -1)
      const datesSorted = [...dates].sort(antiChrono)
      expect(dates).toEqual(datesSorted)
    })
  })

  // ----------- NewTest ----------- //
  describe("When I am on Bills Page and click on the New Bill button", () => {
    test("Then it should navigate to the New Bill page", async () => {
      // Configurer le stockage local et naviguer vers la page des Factures
      Object.defineProperty(window, 'localStorage', { value: localStorageMock });
      window.localStorage.setItem('user', JSON.stringify({ type: 'Employee' }));
  
      // Préparer le DOM et initialiser le routeur
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
  
      // Mock de onNavigate et instanciation de Bills
      const onNavigate = jest.fn((path) => window.onNavigate(path));
      new Bills({
        document,
        onNavigate,
        store: null,
        localStorage: window.localStorage
      });
  
      // Vérifier que le bouton est dans le DOM et simuler le clic
      const newBillButton = await screen.findByTestId('btn-new-bill');
      userEvent.click(newBillButton);
  
      // S'attendre à ce que onNavigate ait été appelé avec le chemin de la Nouvelle Facture
      await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH.NewBill));
    });
  });
  

  describe("When I am on Bills Page and somthing wrong", () => {
    let bill;
    beforeEach(() => {
      // Simuler l'initialisation de l'objet Bills
      const onNavigate = jest.fn();
      const store = {
        bills: () => ({
          list: jest.fn().mockResolvedValue([
            { date: "2023-10-15", status: "accepted" },
            { date: "invalid-date", status: "refused" }, // Cas de données corrompues
          ]),
        }),
      };

      bill = new Bills({
        document,
        onNavigate,
        store,
        localStorage: window.localStorage
      });
    });

    test("Then should log an error for each invalid date and return formatted bills", async () => {
      const consoleSpy = jest.spyOn(console, "log");

      const bills = await bill.getBills();

      // Vérifiez que le nombre d'appels à console.log correspond à 2
      expect(consoleSpy).toHaveBeenCalledTimes(2);

      // Vérifiez les messages d'erreur enregistrés
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(RangeError), "for", expect.objectContaining({ "date": "invalid-date", "status": "refused" }));

      // Vérifiez que les factures retournées incluent les données formatées
      expect(bills.length).toBe(2); // Vérifiez que le nombre total de factures est correct
      expect(bills[0]).toEqual({ date: "15 Oct. 23", status: "Accepté" });
      expect(bills[1]).toEqual({ date: "invalid-date", status: "Refusé" }); 
      // Restaurer l'espion
      consoleSpy.mockRestore();
    });

    test("Then should return formatted bills when dates are valid", async () => {
      const bills = await bill.getBills();
      expect(bills[0].date).toBe("15 Oct. 23"); // Correspond au format retourné
      expect(bills[0].status).toBe("Accepté");
    });

  });

  // ----------- NewTest : icon oeil et ouverture modal----------- //
  describe("When I am on Bills Page and I click on the icon eye", () => {

    describe("Set local storage item", () => {
      beforeEach(() => {
        window.localStorage.clear();
      });
      afterEach(() => {
        jest.clearAllMocks();
      });

      test("a modal should open displaying the invoice receipt", () => {

        $.fn.modal = jest.fn(); // tester l’interaction avec les modals sans les afficher

        const onNavigate = (pathname) => {
          document.body.innerHTML = ROUTES({ pathname })
        };

        Object.defineProperty(window, 'localStorage', { value: localStorageMock });
        window.localStorage.setItem(
          'user',
          JSON.stringify({
            type: 'Employee',
            email: 'a@a',
          })
        );

        document.body.innerHTML = BillsUI({ data: bills });

        const store = mockStore;
        const bill = new Bills({
          document,
          onNavigate,
          store,
          localStorage:
            window.localStorage
        });

        const iconEye = screen.getAllByTestId("icon-eye");
        const handelShowBillReceipt = jest.fn((icon) => bill.handleClickIconEye(icon));
        if (iconEye) iconEye.forEach((icon) => {
          icon.addEventListener("click", handelShowBillReceipt(icon));
          userEvent.click(icon);
        });

        expect(handelShowBillReceipt).toHaveBeenCalled();
        expect(screen.getByTestId("invoicereceipt")).toBeTruthy()
        expect(screen.getByText("Justificatif")).toBeTruthy();
      });
    });
  });

  // ----------- NewTest : Test d'intégration GET Bills----------- //
  describe("Given im a user connected as Employee", () => {

    describe("Set local storage item", () => {
      beforeEach(() => {
        window.localStorage.clear();
      });
      afterEach(() => {
        jest.clearAllMocks();
      });

      describe("When i nav to Bills", () => {
        test("Fetch bills from mock API GET", async () => {

          Object.defineProperty(window, 'localStorage', { value: localStorageMock });

          window.localStorage.setItem(
            'user',
            JSON.stringify({
              type: 'Employee',
              email: 'a@a',
            })
          );

          const root = document.createElement("div");
          root.setAttribute("id", "root");
          document.body.append(root);
          router();
          window.onNavigate(ROUTES_PATH.Bills);

          const getStoreSpyOn = jest.spyOn(mockStore, "bills");

          const bills = await mockStore.bills().list();
          expect(getStoreSpyOn).toHaveBeenCalledTimes(1);
          expect(bills.length).toBe(4);

          await waitFor(() => screen.getByText("Mes notes de frais"));
          expect(screen.getAllByTestId("tbody")).toBeTruthy();
        });

        describe("When an error occurs on API", () => {
          beforeEach(() => {
            jest.spyOn(mockStore, "bills");
            Object.defineProperty(window, "localStorage", { value: localStorageMock });
            window.localStorage.setItem(
              'user',
              JSON.stringify({
                type: 'Employee',
                email: 'a@a',
              })
            )
            const root = document.createElement("div");
            root.setAttribute("id", "root");
            document.body.appendChild(root);
            router();
          });

          test("fetches bills from an API and fails with 404 message error", async () => {
            mockStore.bills.mockImplementationOnce(() => {
              return {
                list: () => { return Promise.reject(new Error("Erreur 404")) },
              }
            })

            window.onNavigate(ROUTES_PATH.Bills);
            await new Promise(process.nextTick);
            const message = await screen.getByText(/Erreur 404/);
            expect(message).toBeTruthy();
          });

          test("fetches messages from an API and fails with 500 message error", async () => {
            mockStore.bills.mockImplementationOnce(() => {
              return {
                list: () => { return Promise.reject(new Error("Erreur 500")) },
              }
            });

            window.onNavigate(ROUTES_PATH.Bills)
            await new Promise(process.nextTick);
            const message = await screen.getByText(/Erreur 500/);
            expect(message).toBeTruthy()
          });
        });
      });
    });

  })
})
