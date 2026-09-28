export class Constants {
  public static pageLimit = 100;
  public static pageOptions = [5, 25, 50, 100];

  public static sellerDetails =
    "This module displays a list of sellers with detailed information accessible by the admin.";

  public static sellerStoreDetails =
    "This module displays a list of seller stores with detailed information accessible by the admin.";

  public static userDetails =
    "This module displays a list of premises users with detailed information accessible by the admin.";

  public static portalDetails =
    "This module displays a list of shops with detailed information, including creation date, Shop name, number, status, and more.";

  public static inventoryDetails =
    "This module displays detailed information about the products, including product name, price, stock levels, and other related data.";

  public static orderDetails =
    "This module displays detailed information about Amazon orders, including order ID, purchase date, status, fulfillment, and item details.";

  public static settingDetails =
    "This module manage setting for multiple marketplaces";

  public static generalSettingDetails =
    "This module manages general settings and marketplace configuration.";

  public static webSettingDetails =
    "This module manages website settings, company profile, contact details, social media, and footer content.";

  public static systemLogDetails =
    "The System Log module display listing for system log.";

  public static sellerRoleDetails =
    "This module displays a list of seller roles with detailed information accessible by the seller.";

  public static roleDetails =
    "This module displays a list of roles with detailed information accessible by the admin.";

  public static planDetails =
    "This module displays a list of plans with detailed information, including name, price, limits, and other options.";

  public static cronManagementDetails =
    "This module displays background cron jobs with controls to start, stop, force run, or schedule delayed execution.";

  public static cronLogsDetails =
    "This module displays background cron execution logs with status, execution time, and schedule history.";

  public static contactDetails =
    "This module displays a list of contacts and inquiries submitted by users.";

  public static couponDetails =
    "This module displays a list of coupons and promo codes with detailed settings.";

  public static catalogDetails =
    "This module displays a list of catalog products with details.";

  public static sellerUserDetails =
    "This module displays a list of seller users with detailed information accessible by the admin.";

  public static tagDetails =
    "This module displays a list of tags and tag settings used for catalog organization.";

  public static supportTicketDetails =
    "This module displays a list of support tickets and customer inquiry conversations.";

  public static faqDetails =
    "This module manages Frequently Asked Questions (FAQs) for quick reference and support.";

  public static bannedItemDetails =
    "This module displays detailed information about banned items blocked by Banned ASIN and Banned Keyword rules.";

  public static adminApiAccessDetails =
    "This module manages API access control, permissions, and route policies for admin users.";

  public static sellerApiAccessDetails =
    "This module manages API access control, permissions, and route policies for seller users.";

  public static featureDetails =
    "This module manages system features and access capabilities across subscription plans.";

  public static featureMeterDetails =
    "This module manages feature usage meters, tracking limits and consumption metrics for plans.";

  public static subscriptionUsersDetails =
    "This module displays a list of seller subscriptions and user accounts with status, plan details, and lifecycle information.";

  public static leadsDetails =
    "This module displays captured seller leads from checkout flows with contact details, plan intent, and conversion status.";

  public static amazonComplianceDetails =
    "This module manages Amazon compliance policies, restricted ASINs, keywords, and brand suppression rules.";

  public static uploadedFilesDetails =
    "This module displays catalog and inventory file upload feeds, processing status, and error logs.";

  public static subscriptionDetails =
    "This module manages subscription plans, usage analytics, billing history, and plan upgrades.";

  public static amazonMarketplaces = [
    {
      id: "A2EUQ1WTGCTBG2",
      countryCode: "CA",
      awsRegion: "us-east-1",
      sellerCentralURL: "https://sellercentral.amazon.ca",
      spApiEndPoint: "https://sellingpartnerapi-na.amazon.com",
      countryName: "Canada",
      currency: "C$",
      amazonLink: "https://www.amazon.ca/dp/",
      currencyCode: "CAD",
    },
    {
      id: "ATVPDKIKX0DER",
      countryCode: "US",
      awsRegion: "us-east-1",
      countryName: "United States",
      sellerCentralURL: "https://sellercentral.amazon.com",
      spApiEndPoint: "https://sellingpartnerapi-na.amazon.com",
      currency: "$",
      amazonLink: "https://www.amazon.com/dp/",
      currencyCode: "USD",
    },
    {
      id: "A1AM78C64UM0Y8",
      countryCode: "MX",
      awsRegion: "us-east-1",
      countryName: "Mexico",
      sellerCentralURL: "https://sellercentral.amazon.com.mx",
      spApiEndPoint: "https://sellingpartnerapi-na.amazon.com",
      currency: "$",
      amazonLink: "https://www.amazon.com.mx/dp/",
      currencyCode: "MXN",
    },
    {
      id: "A2Q3Y263D00KWC",
      countryCode: "BR",
      awsRegion: "us-east-1",
      countryName: "Brazil",
      sellerCentralURL: "https://sellercentral.amazon.com.br",
      spApiEndPoint: "https://sellingpartnerapi-na.amazon.com",
      currency: "R$",
      amazonLink: "https://www.amazon.com.br/dp/",
      currencyCode: "BRL",
    },
    {
      id: "A1RKKUPIHCS9HS",
      countryCode: "ES",
      awsRegion: "eu-west-1",
      countryName: "Spain",
      sellerCentralURL: "https://sellercentral-europe.amazon.com",
      spApiEndPoint: "https://sellingpartnerapi-eu.amazon.com",
      currency: "€",
      currencyCode: "EUR",
      amazonLink: "https://www.amazon.es/dp/",
    },
    {
      id: "AE08WJ6YKNBMC",
      countryCode: "ZA",
      awsRegion: "eu-west-1",
      countryName: "South Africa",
      sellerCentralURL: "https://sellercentral.amazon.com/",
      spApiEndPoint: "https://sellingpartnerapi-eu.amazon.com",
      currency: "R",
      amazonLink: "https://www.amazon.co.za/dp/",
      currencyCode: "ZAR",
    },
    {
      id: "A28R8C7NBKEWEA",
      countryCode: "IE",
      awsRegion: "eu-west-1",
      countryName: "Ireland",
      sellerCentralURL: "https://sellercentral.amazon.com/",
      spApiEndPoint: "https://sellingpartnerapi-eu.amazon.com",
      currency: "€",
      amazonLink: "https://www.amazon.co.uk/dp/",
      currencyCode: "EUR",
    },
    {
      id: "A1F83G8C2ARO7P",
      countryCode: "UK",
      awsRegion: "eu-west-1",
      countryName: "United Kingdom",
      sellerCentralURL: "https://sellercentral-europe.amazon.com",
      spApiEndPoint: "https://sellingpartnerapi-eu.amazon.com",
      currency: "£",
      currencyCode: "GBP",
      amazonLink: "https://www.amazon.co.uk/dp/",
    },
    {
      id: "A13V1IB3VIYZZH",
      countryCode: "FR",
      awsRegion: "eu-west-1",
      countryName: "France",
      sellerCentralURL: "https://sellercentral-europe.amazon.com",
      spApiEndPoint: "https://sellingpartnerapi-eu.amazon.com",
      currency: "€",
      currencyCode: "EUR",
      amazonLink: "https://www.amazon.fr/dp/",
    },
    {
      id: "AMEN7PMS3EDWL",
      countryCode: "BE",
      awsRegion: "eu-west-1",
      countryName: "Belgium",
      sellerCentralURL: "https://sellercentral.amazon.com.be",
      spApiEndPoint: "https://sellingpartnerapi-eu.amazon.com",
      currency: "€",
      amazonLink: "https://www.amazon.com.be/dp/",
      currencyCode: "EUR",
    },
    {
      id: "A1805IZSGTT6HS",
      countryCode: "NL",
      awsRegion: "eu-west-1",
      countryName: "Netherlands",
      sellerCentralURL: "https://sellercentral.amazon.nl",
      spApiEndPoint: "https://sellingpartnerapi-eu.amazon.com",
      currency: "€",
      currencyCode: "EUR",
      amazonLink: "https://www.amazon.nl/dp/",
    },
    {
      id: "A1PA6795UKMFR9",
      countryCode: "DE",
      awsRegion: "eu-west-1",
      countryName: "Germany",
      sellerCentralURL: "https://sellercentral-europe.amazon.com",
      spApiEndPoint: "https://sellingpartnerapi-eu.amazon.com",
      currency: "€",
      currencyCode: "EUR",
      amazonLink: "https://www.amazon.de/dp/",
    },
    {
      id: "APJ6JRA9NG5V4",
      countryCode: "IT",
      awsRegion: "eu-west-1",
      countryName: "Italy",
      sellerCentralURL: "https://sellercentral-europe.amazon.com",
      spApiEndPoint: "https://sellingpartnerapi-eu.amazon.com",
      currency: "€",
      currencyCode: "EUR",
      amazonLink: "https://www.amazon.it/dp/",
    },
    {
      id: "A2NODRKZP88ZB9",
      countryCode: "SE",
      awsRegion: "eu-west-1",
      countryName: "Sweden",
      sellerCentralURL: "https://sellercentral.amazon.se",
      spApiEndPoint: "https://sellingpartnerapi-eu.amazon.com",
      currency: "kr",
      currencyCode: "SEK",
      amazonLink: "https://www.amazon.se/dp/",
    },
    {
      id: "A1C3SOZRARQ6R3",
      countryCode: "PL",
      awsRegion: "eu-west-1",
      countryName: "Poland",
      sellerCentralURL: "https://sellercentral.amazon.pl",
      spApiEndPoint: "https://sellingpartnerapi-eu.amazon.com",
      currency: " zł",
      currencyCode: "PLN",
      amazonLink: "https://www.amazon.pl/dp/",
    },
    {
      id: "ARBP9OOSHTCHU",
      countryCode: "EG",
      awsRegion: "eu-west-1",
      countryName: "Egypt",
      sellerCentralURL: "https://sellercentral.amazon.eg",
      spApiEndPoint: "https://sellingpartnerapi-eu.amazon.com",
      currency: "ج.م",
      currencyCode: "EGP",
      amazonLink: "https://www.amazon.eg/dp/",
    },
    {
      id: "A33AVAJ2PDY3EV",
      countryCode: "TR",
      awsRegion: "eu-west-1",
      countryName: "Turkey",
      sellerCentralURL: "https://sellercentral.amazon.com.tr",
      spApiEndPoint: "https://sellingpartnerapi-eu.amazon.com",
      currency: "₺",
      currencyCode: "TRY",
      amazonLink: "https://www.amazon.com.tr/dp/",
    },
    {
      id: "A17E79C6D8DWNP",
      countryCode: "SA",
      awsRegion: "eu-west-1",
      countryName: "Saudi Arabia",
      sellerCentralURL: "https://sellercentral.amazon.sa",
      spApiEndPoint: "https://sellingpartnerapi-eu.amazon.com",
      currency: " ر.س",
      currencyCode: "SAR",
      amazonLink: "https://www.amazon.sa/dp/",
    },
    {
      id: "A2VIGQ35RCS4UG",
      countryCode: "AE",
      awsRegion: "eu-west-1",
      countryName: "UAE",
      sellerCentralURL: "https://sellercentral.amazon.ae",
      spApiEndPoint: "https://sellingpartnerapi-eu.amazon.com",
      currency: "د.إ",
      currencyCode: "AED",
      amazonLink: "https://www.amazon.ae/dp/",
    },
    {
      id: "A21TJRUUN4KGV",
      countryCode: "IN",
      awsRegion: "eu-west-1",
      countryName: "India",
      sellerCentralURL: "https://sellercentral.amazon.in",
      spApiEndPoint: "https://sellingpartnerapi-eu.amazon.com",
      currency: "₹",
      currencyCode: "INR",
      amazonLink: "https://www.amazon.in/dp/",
    },
    {
      id: "A19VAU5U5O7RUS",
      countryCode: "SG",
      awsRegion: "us-west-2",
      countryName: "Singapore",
      sellerCentralURL: "https://sellercentral.amazon.sg",
      spApiEndPoint: "https://sellingpartnerapi-fe.amazon.com",
      currency: "$",
      amazonLink: "https://www.amazon.sg/dp/",
      currencyCode: "SGD",
    },
    {
      id: "A39IBJ37TRP1C6",
      countryCode: "AU",
      awsRegion: "us-west-2",
      countryName: "Australia",
      sellerCentralURL: "https://sellercentral.amazon.com.au",
      spApiEndPoint: "https://sellingpartnerapi-fe.amazon.com",
      currency: "$",
      amazonLink: "https://www.amazon.com.au/dp/",
      currencyCode: "AUD",
    },
    {
      id: "A1VC38T7YXB528",
      countryCode: "JP",
      awsRegion: "us-west-2",
      countryName: "Japan",
      sellerCentralURL: "https://sellercentral.amazon.co.jp",
      spApiEndPoint: "https://sellingpartnerapi-fe.amazon.com",
      currency: "¥",
      amazonLink: "https://www.amazon.co.jp/dp/",
      currencyCode: "JPY",
    },
  ];

  public static productTypeList = [
    { value: "retail_amazon_inventory", label: "Retail Amazon Inventory" },
    {
      value: "white_label_amazon_inventory",
      label: "White Label Amazon Inventory",
    },
  ];

  public static Marketplace = [
    { value: "retail_amazon_inventory", label: "Retail Amazon Inventory" },
    {
      value: "white_label_amazon_inventory",
      label: "White Label Amazon Inventory",
    },
  ];

  public static adminSupportCategories = [
    { value: "Sellers Management", label: "Sellers Management" },
    { value: "Users And Roles", label: "Users And Roles" },
    { value: "Shops", label: "Shops" },
    { value: "Subscription Plans", label: "Subscription Plans" },
    { value: "Coupons", label: "Coupons" },

    { value: "Technical Support", label: "Technical Support" },
    { value: "Billing And Payments", label: "Billing And Payments" },
    { value: "Other", label: "Other" },
  ];

  public static sellerSupportCategories = [
    { value: "My Catalog And Products", label: "My Catalog And Products" },
    { value: "Amazon Integration", label: "Amazon Integration" },
    { value: "Amazon Compliance", label: "Amazon Compliance" },
    { value: "Seller Users And Roles", label: "Seller Users And Roles" },
    { value: "Authorization Workflow", label: "Authorization Workflow" },
    { value: "Tag Settings", label: "Tag Settings" },
    { value: "General Settings", label: "General Settings" },
    { value: "Billing And Subscription", label: "Billing And Subscription" },
    { value: "Technical Support", label: "Technical Support" },
    { value: "Other", label: "Other" },
  ];

  public static countryList: { code: string; label: string }[] = [
    { code: "IN", label: "IN - India" },
    { code: "US", label: "US - United States" },
    { code: "UK", label: "UK - United Kingdom" },
    { code: "CN", label: "CN - China" },
    { code: "DE", label: "DE - Germany" },
    { code: "JP", label: "JP - Japan" },
    { code: "FR", label: "FR - France" },
    { code: "IT", label: "IT - Italy" },
    { code: "CA", label: "CA - Canada" },
    { code: "AU", label: "AU - Australia" },
    { code: "AE", label: "AE - United Arab Emirates" },
    { code: "AF", label: "AF - Afghanistan" },
    { code: "AL", label: "AL - Albania" },
    { code: "AM", label: "AM - Armenia" },
    { code: "AR", label: "AR - Argentina" },
    { code: "AT", label: "AT - Austria" },
    { code: "BD", label: "BD - Bangladesh" },
    { code: "BE", label: "BE - Belgium" },
    { code: "BG", label: "BG - Bulgaria" },
    { code: "BH", label: "BH - Bahrain" },
    { code: "BR", label: "BR - Brazil" },
    { code: "CH", label: "CH - Switzerland" },
    { code: "CL", label: "CL - Chile" },
    { code: "CO", label: "CO - Colombia" },
    { code: "CZ", label: "CZ - Czechia" },
    { code: "DK", label: "DK - Denmark" },
    { code: "DZ", label: "DZ - Algeria" },
    { code: "EG", label: "EG - Egypt" },
    { code: "ES", label: "ES - Spain" },
    { code: "FI", label: "FI - Finland" },
    { code: "GR", label: "GR - Greece" },
    { code: "HK", label: "HK - Hong Kong" },
    { code: "HR", label: "HR - Croatia" },
    { code: "HU", label: "HU - Hungary" },
    { code: "ID", label: "ID - Indonesia" },
    { code: "IE", label: "IE - Ireland" },
    { code: "IL", label: "IL - Israel" },
    { code: "IQ", label: "IQ - Iraq" },
    { code: "IR", label: "IR - Iran" },
    { code: "IS", label: "IS - Iceland" },
    { code: "JO", label: "JO - Jordan" },
    { code: "KR", label: "KR - South Korea" },
    { code: "KW", label: "KW - Kuwait" },
    { code: "LK", label: "LK - Sri Lanka" },
    { code: "MA", label: "MA - Morocco" },
    { code: "MX", label: "MX - Mexico" },
    { code: "MY", label: "MY - Malaysia" },
    { code: "NG", label: "NG - Nigeria" },
    { code: "NL", label: "NL - Netherlands" },
    { code: "NO", label: "NO - Norway" },
    { code: "NP", label: "NP - Nepal" },
    { code: "NZ", label: "NZ - New Zealand" },
    { code: "OM", label: "OM - Oman" },
    { code: "PH", label: "PH - Philippines" },
    { code: "PK", label: "PK - Pakistan" },
    { code: "PL", label: "PL - Poland" },
    { code: "PT", label: "PT - Portugal" },
    { code: "QA", label: "QA - Qatar" },
    { code: "RO", label: "RO - Romania" },
    { code: "RU", label: "RU - Russia" },
    { code: "SA", label: "SA - Saudi Arabia" },
    { code: "SE", label: "SE - Sweden" },
    { code: "SG", label: "SG - Singapore" },
    { code: "TH", label: "TH - Thailand" },
    { code: "TR", label: "TR - Turkey" },
    { code: "TW", label: "TW - Taiwan" },
    { code: "UA", label: "UA - Ukraine" },
    { code: "VN", label: "VN - Vietnam" },
    { code: "ZA", label: "ZA - South Africa" },
  ];
}
