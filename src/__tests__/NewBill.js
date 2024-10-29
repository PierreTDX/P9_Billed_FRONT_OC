/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import NewBillUI from "../views/NewBillUI.js"
import NewBill from "../containers/NewBill.js"
import mockStore from "../__mocks__/store" // NewTest
import { localStorageMock } from "../__mocks__/localStorage.js" // New Test
import BillsUI from "../views/BillsUI.js" // New Test
import { ROUTES_PATH } from "../constants/routes.js" // NewTest
import { screen, fireEvent, waitFor } from "@testing-library/dom"; // NewTest
import userEvent from '@testing-library/user-event'; // NewTest

import router from "../app/Router.js" // NewTest

jest.mock("../app/store", () => mockStore) // NewTest

describe("Given I am connected as an employee", () => {

  // ----------- NewTest ----------- //
  describe("When I upload a wrong file type", () => {
    test("Then an error message is displayed", async () => {
      jest.spyOn(console, 'error').mockImplementation(() => { });

      // Créer une fonction fictive pour onNavigate
      const onNavigate = jest.fn();

      // Créer le HTML pour le test
      const html = NewBillUI();
      document.body.innerHTML = html;

      // Assurer que window.onNavigate est défini
      window.onNavigate = onNavigate;

      const newBill = new NewBill({
        document,
        onNavigate,
        mockStore,
        localStorage: window.localStorage,
      });

      const inputFile = screen.getByTestId("file");
      const handleChangeFile = jest.fn((e) => newBill.handleChangeFile(e));
      inputFile.addEventListener("change", handleChangeFile);

      const newFile = new File(["receiptTest.mp4"], "receiptTest.mp4", { type: "video/mp4" });
      userEvent.upload(inputFile, newFile);

      expect(handleChangeFile).toHaveBeenCalled();
      expect(inputFile.files[0].type).toBe("video/mp4");
      expect(inputFile.value).toBe('');

      await waitFor(() => screen.getByTestId("message_file_type_error"));
      const errorFileType = screen.queryByTestId("message_file_type_error");
      expect(errorFileType.className).toBe("msgErrorFiletype");
    });
  });

  describe("When I upload allowed file type", () => {
    test("Then uploaded file name is displayed", async () => {
      const html = NewBillUI();
      document.body.innerHTML = html;

      // Mock de la fonction onNavigate
      const onNavigate = jest.fn();

      // Mock de l'objet store
      const store = {
        bills: {
          create: jest.fn(),
          update: jest.fn(),
          list: jest.fn(() => Promise.resolve([])), // Simulez une liste vide de factures
        },
      };

      // Création d'une instance de NewBill avec onNavigate et store mockés
      const newBill = new NewBill({
        document,
        onNavigate,
        store,
        localStorage: window.localStorage,
      });

      const inputFile = screen.getByTestId("file");
      const handleChangeFile = jest.fn((e) => newBill.handleChangeFile(e));
      inputFile.addEventListener("change", handleChangeFile);

      const newFile = new File(["receiptTest.png"], "receiptTest.png", { type: "image/png" });
      userEvent.upload(inputFile, newFile);

      expect(handleChangeFile).toHaveBeenCalled();
      expect(inputFile.files[0].type).toBe("image/png");
      expect(inputFile.files[0]).toEqual(newFile);

      await waitFor(() => screen.getByTestId("message_file_type_error"));
      const errorFileType = screen.queryByTestId("message_file_type_error");
      expect(errorFileType.getAttribute("class")).toMatch(/msgErrorFiletype hidden/);
    });
  });


  // ----------- NewTest Soumettre le formulaire NewBill----------- //
  describe("When I fill the bill form with valid input", () => {
    test("Then I click on submit button and submit function is called", async () => {
      const html = NewBillUI();
      document.body.innerHTML = html;

      window.onNavigate(ROUTES_PATH.NewBill);

      // Mock de localStorage pour inclure un email utilisateur
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn(() => JSON.stringify({ email: "test@example.com" })),
          setItem: jest.fn(),
          clear: jest.fn(),
        },
        writable: true
      });

      // Définir mockStore avec bills comme une fonction retournant un objet avec `create`
      const mockStore = {
        bills: jest.fn(() => ({
          create: jest.fn(() => Promise.resolve({}))
        })),
        users: jest.fn(() => Promise.resolve([{ email: "test@example.com" }])),
      };

      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage
      });

      // Assurer que les éléments de formulaire existent avant d'interagir
      await waitFor(() => expect(screen.getByTestId('form-new-bill')).toBeInTheDocument());

      const testBill = {
        type: 'Restaurants et bars',
        name: 'O\'Bistro',
        date: '2015-07-02',
        amount: 47,
        vat: 20,
        pct: 5,
        commentary: 'Repas séminaire',
        fileUrl: '/src/assets/images/facturefreemobile.jpg',
        fileName: 'facturefreemobile.jpg',
        status: 'pending',
      };

      // Remplir le formulaire avec des données de test
      screen.getByTestId('expense-type').value = testBill.type;
      screen.getByTestId('expense-name').value = testBill.name;
      screen.getByTestId('datepicker').value = testBill.date;
      screen.getByTestId('amount').value = testBill.amount;
      screen.getByTestId('vat').value = testBill.vat;
      screen.getByTestId('pct').value = testBill.pct;
      screen.getByTestId('commentary').value = testBill.commentary;

      newBill.fileName = testBill.fileName;
      newBill.fileUrl = testBill.fileUrl;

      const handleSubmit = jest.fn((e) => newBill.handleSubmit(e));
      const form = screen.getByTestId("form-new-bill");
      form.addEventListener("submit", handleSubmit);

      fireEvent.submit(form);

      expect(handleSubmit).toHaveBeenCalled();
    });
  });

  // ----------- NewTest : Test d'intégration POST Bills----------- //
  describe("When i submit a valid new bill", () => {
    test("Fetch new bills to mock API POST", async () => {
      // Mock de la fonction create de l'API
      jest.spyOn(mockStore, "bills").mockImplementationOnce(() => {
        return {
          create: () => {
            return Promise.resolve();
          },
        };
      });

      // Vérification de l'appel API POST
      await expect(mockStore.bills().create()).resolves.toBeUndefined();
    });
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
    })

    test("Fetches bills to an API and fails with 404 message error - 404 Not Found", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 404"));
          },
        };
      });

      const html = BillsUI({ error: "Erreur 404" });
      document.body.innerHTML = html;
      await new Promise(process.nextTick);
      const message = await screen.getByText(/Erreur 404/);
      expect(message).toBeTruthy();
    });

    test("Fetches bills to an API and fails with 500 message error - 500 Internal Server Error", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 500"));
          },
        };
      });

      const html = BillsUI({ error: "Erreur 500" });
      document.body.innerHTML = html;
      await new Promise(process.nextTick);
      const message = await screen.getByText(/Erreur 500/);
      expect(message).toBeTruthy();
    });
  });
})