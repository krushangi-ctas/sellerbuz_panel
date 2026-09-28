interface IAuthorizeAccount {
  marketplaceType: "AMAZON";
  marketplaceChannel:
    | "CA"
    | "US"
    | "MX"
    | "BR"
    | "ES"
    | "UK"
    | "FR"
    | "BE"
    | "NL"
    | "DE"
    | "IT"
    | "SE"
    | "PL"
    | "EG"
    | "TR"
    | "SA"
    | "AE"
    | "IN"
    | "SG"
    | "AU"
    | "JP";
  sellerCentralURL: any;
}

const inits: IAuthorizeAccount = {
  marketplaceType: "AMAZON",
  marketplaceChannel: "US",
  sellerCentralURL: "https://sellercentral.amazon.com",
};

export { IAuthorizeAccount, inits };
