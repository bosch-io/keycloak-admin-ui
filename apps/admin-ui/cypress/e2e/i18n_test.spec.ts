import LoginPage from "../support/pages/LoginPage";
import SidebarPage from "../support/pages/admin-ui/SidebarPage";
import adminClient from "../support/util/AdminClient";
import { keycloakBefore } from "../support/util/keycloak_hooks";
import ProviderPage from "../support/pages/admin-ui/manage/providers/ProviderPage";

const loginPage = new LoginPage();
const sidebarPage = new SidebarPage();

const providersPage = new ProviderPage();

const usernameI18nTest = "user_i18n_test";
let usernameI18nId: string;

let pageLoaded: boolean = false;
let originallySupportedLocales: string[];

describe("i18n tests", () => {
  before(() => {
    cy.wrap(null).then(async () => {
      const realm = (await adminClient.getRealm("master"))!;
      originallySupportedLocales = realm.supportedLocales ?? [];
      realm.supportedLocales = ["en", "de", "de-CH", "fo"];
      await adminClient.updateRealm("master", realm);

      const { id: userId } = await adminClient.createUser({
        username: usernameI18nTest,
        enabled: true,
        credentials: [
          { type: "password", temporary: false, value: usernameI18nTest },
        ],
      });
      usernameI18nId = userId;

      await adminClient.addRealmRoleToUser(usernameI18nId, "admin");
    });

    keycloakBefore();
  });

  after(async () => {
    await adminClient.deleteUser(usernameI18nTest);

    if (originallySupportedLocales != null) {
      const realm = (await adminClient.getRealm("master"))!;
      realm.supportedLocales = originallySupportedLocales;
      await adminClient.updateRealm("master", realm);
    }
  });

  afterEach(async () => {
    await adminClient.removeAllLocalizationTexts();
  });

  const realmLocalizationEn = "realmSettings en";
  const themeLocalizationEn = "Realm settings";
  const realmLocalizationDe = "realmSettings de";
  const themeLocalizationDe = "Realm-Einstellungen";
  const realmLocalizationDeCh = "realmSettings de-CH";

  it("should use THEME localization for fallback (en) when language without theme localization is requested and no realm localization exists", () => {
    updateUserLocale("fo");

    openOrReloadUserFederationPage();

    sidebarPage.checkRealmSettingsLinkContainsText(themeLocalizationEn);
  });

  it("should use THEME localization for language when language with theme localization is requested and no realm localization exists", () => {
    updateUserLocale("de");

    openOrReloadUserFederationPage();

    sidebarPage.checkRealmSettingsLinkContainsText(themeLocalizationDe);
  });

  it("should use REALM localization for fallback (en) when language without theme localization is requested and realm localization exists for fallback (en)", () => {
    addCommonRealmSettingsLocalizationText("en", realmLocalizationEn);
    updateUserLocale("fo");

    openOrReloadUserFederationPage();

    sidebarPage.checkRealmSettingsLinkContainsText(realmLocalizationEn);
  });

  it("should use THEME localization for language when language with theme localization is requested and realm localization exists for fallback (en) only", () => {
    addCommonRealmSettingsLocalizationText("en", realmLocalizationEn);
    updateUserLocale("de");

    openOrReloadUserFederationPage();

    sidebarPage.checkRealmSettingsLinkContainsText(themeLocalizationDe);
  });

  it("should use REALM localization for language when language is requested and realm localization exists for language", () => {
    addCommonRealmSettingsLocalizationText("de", realmLocalizationDe);
    updateUserLocale("de");

    openOrReloadUserFederationPage();

    sidebarPage.checkRealmSettingsLinkContainsText(realmLocalizationDe);
  });

  it("should use REALM localization for region when region is requested and realm localization exists for region", () => {
    addCommonRealmSettingsLocalizationText("de-CH", realmLocalizationDeCh);
    updateUserLocale("de-CH");

    openOrReloadUserFederationPage();

    sidebarPage.checkRealmSettingsLinkContainsText(realmLocalizationDeCh);
  });

  it("should use REALM localization for language when language is requested and realm localization exists for fallback (en), language, region", () => {
    addCommonRealmSettingsLocalizationText("en", realmLocalizationEn);
    addCommonRealmSettingsLocalizationText("de", realmLocalizationDe);
    addCommonRealmSettingsLocalizationText("de-CH", realmLocalizationDeCh);
    updateUserLocale("de");

    openOrReloadUserFederationPage();

    sidebarPage.checkRealmSettingsLinkContainsText(realmLocalizationDe);
  });

  it("should use REALM localization for language when region is requested and realm localization exists for fallback (en), language", () => {
    addCommonRealmSettingsLocalizationText("en", realmLocalizationEn);
    addCommonRealmSettingsLocalizationText("de", realmLocalizationDe);
    updateUserLocale("de-CH");

    openOrReloadUserFederationPage();

    sidebarPage.checkRealmSettingsLinkContainsText(realmLocalizationDe);
  });

  it("should apply plurals and interpolation for THEME localization", () => {
    updateUserLocale("en");

    openOrReloadUserFederationPage();

    // check key "user-federation:addProvider_other"
    providersPage.assertCardContainsText("ldap", "Add Ldap providers");
  });

  it("should apply plurals and interpolation for REALM localization", () => {
    addLocalization(
      "en",
      "user-federation:addProvider_other",
      "addProvider_other en: {{provider}}"
    );
    updateUserLocale("en");

    openOrReloadUserFederationPage();

    providersPage.assertCardContainsText("ldap", "addProvider_other en: Ldap");
  });

  function openOrReloadUserFederationPage() {
    if (!pageLoaded) {
      loginPage.logIn(usernameI18nTest, usernameI18nTest);
      sidebarPage.goToUserFederation();
      pageLoaded = true;
    } else {
      cy.reload();
      sidebarPage.waitForPageLoad();
    }
  }

  function updateUserLocale(locale: string) {
    cy.wrap(null).then(() =>
      adminClient.updateUser(usernameI18nId, { attributes: { locale: locale } })
    );
  }

  function addCommonRealmSettingsLocalizationText(
    locale: string,
    value: string
  ) {
    addLocalization(locale, "common:realmSettings", value);
  }

  function addLocalization(locale: string, key: string, value: string) {
    cy.wrap(null).then(() =>
      adminClient.addLocalizationText(locale, key, value)
    );
  }
});
