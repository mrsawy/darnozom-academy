import { Country, Currency } from '@darnozom/shared-types';

export const getPreferredCurrency = (country: Country): Currency => {
  switch (country) {
    // Arab countries
    case Country.Egypt: {
      return Currency.EGP;
    }
    // case Country.UnitedArabEmirates: {
    //   return Currency.AED;
    // }
    // case Country.SaudiArabia: {
    //   return Currency.SAR;
    // }
    // case Country.Kuwait: {
    //   return Currency.KWD;
    // }
    // case Country.Qatar: {
    //   return Currency.QAR;
    // }
    // case Country.Bahrain: {
    //   return Currency.BHD;
    // }
    // case Country.Oman: {
    //   return Currency.OMR;
    // }
    // case Country.Libya: {
    //   return Currency.LYD;
    // }
    // case Country.Algeria: {
    //   return Currency.DZD;
    // }
    // case Country.Morocco: {
    //   return Currency.MAD;
    // }
    // case Country.Tunisia: {
    //   return Currency.TND;
    // }
    // case Country.Sudan: {
    //   return Currency.SDG;
    // }
    // case Country.Somalia: {
    //   return Currency.SOS;
    // }
    // case Country.Yemen: {
    //   return Currency.YER;
    // }
    // case Country.Lebanon: {
    //   return Currency.LBP;
    // }
    // case Country.Syria: {
    //   return Currency.SYP;
    // }
    // case Country.Iraq: {
    //   return Currency.IQD;
    // }
    // case Country.Jordan: {
    //   return Currency.JOD;
    // }
    // case Country.Mauritania: {
    //   return Currency.MRU;
    // }

    // // Major European countries
    // case Country.UnitedKingdom: {
    //   return Currency.GBP;
    // }
    // case Country.Germany:
    // case Country.France:
    // case Country.Italy:
    // case Country.Spain:
    // case Country.Netherlands:
    // case Country.Belgium:
    // case Country.Austria:
    // case Country.Finland:
    // case Country.Portugal:
    // case Country.Ireland:
    // case Country.Slovenia:
    // case Country.Slovakia:
    // case Country.Estonia:
    // case Country.Latvia:
    // case Country.Lithuania:
    // case Country.Malta:
    // case Country.Cyprus:
    // case Country.Luxembourg:
    // case Country.Eurozone: {
    //   return Currency.EUR;
    // }
    // case Country.Switzerland: {
    //   return Currency.CHF;
    // }
    // case Country.Sweden: {
    //   return Currency.SEK;
    // }
    // case Country.Norway: {
    //   return Currency.NOK;
    // }
    // case Country.Denmark: {
    //   return Currency.DKK;
    // }
    // case Country.Poland: {
    //   return Currency.PLN;
    // }
    // case Country.CzechRepublic: {
    //   return Currency.CZK;
    // }
    // case Country.Hungary: {
    //   return Currency.HUF;
    // }
    // case Country.Romania: {
    //   return Currency.RON;
    // }
    // case Country.Bulgaria: {
    //   return Currency.BGN;
    // }
    // case Country.Croatia: {
    //   return Currency.HRK;
    // }
    // case Country.Iceland: {
    //   return Currency.ISK;
    // }

    // // Major Asian countries
    // case Country.Japan: {
    //   return Currency.JPY;
    // }
    // case Country.SouthKorea: {
    //   return Currency.KRW;
    // }
    // case Country.India: {
    //   return Currency.INR;
    // }
    // case Country.Singapore: {
    //   return Currency.SGD;
    // }
    // case Country.HongKong: {
    //   return Currency.HKD;
    // }
    // case Country.Taiwan: {
    //   return Currency.TWD;
    // }
    // case Country.Thailand: {
    //   return Currency.THB;
    // }
    // case Country.Malaysia: {
    //   return Currency.MYR;
    // }
    // case Country.Indonesia: {
    //   return Currency.IDR;
    // }
    // case Country.Philippines: {
    //   return Currency.PHP;
    // }
    // case Country.Vietnam: {
    //   return Currency.VND;
    // }
    // case Country.Pakistan: {
    //   return Currency.PKR;
    // }
    // case Country.Bangladesh: {
    //   return Currency.BDT;
    // }
    // case Country.SriLanka: {
    //   return Currency.LKR;
    // }
    // case Country.Nepal: {
    //   return Currency.NPR;
    // }
    // case Country.Cambodia: {
    //   return Currency.KHR;
    // }
    // case Country.Laos: {
    //   return Currency.LAK;
    // }
    // case Country.Myanmar: {
    //   return Currency.MMK;
    // }
    // case Country.Mongolia: {
    //   return Currency.MNT;
    // }
    // case Country.Kazakhstan: {
    //   return Currency.KZT;
    // }
    // case Country.Uzbekistan: {
    //   return Currency.UZS;
    // }
    // case Country.Turkmenistan: {
    //   return Currency.TMT;
    // }
    // case Country.Kyrgyzstan: {
    //   return Currency.KGS;
    // }
    // case Country.Tajikistan: {
    //   return Currency.TJS;
    // }
    // case Country.Azerbaijan: {
    //   return Currency.AZN;
    // }
    // case Country.Georgia: {
    //   return Currency.GEL;
    // }
    // case Country.Armenia: {
    //   return Currency.AMD;
    // }
    // case Country.Turkey: {
    //   return Currency.TRY;
    // }
    // case Country.Iran: {
    //   return Currency.IRR;
    // }
    // case Country.Afghanistan: {
    //   return Currency.AFN;
    // }
    // case Country.China: {
    //   return Currency.CNY;
    // }

    // // Major Americas countries
    // case Country.UnitedStates:
    // case Country.Ecuador: {
    //   return Currency.USD;
    // }
    // case Country.Canada: {
    //   return Currency.CAD;
    // }
    // case Country.Mexico: {
    //   return Currency.MXN;
    // }
    // case Country.Brazil: {
    //   return Currency.BRL;
    // }
    // case Country.Argentina: {
    //   return Currency.ARS;
    // }
    // case Country.Chile: {
    //   return Currency.CLP;
    // }
    // case Country.Colombia: {
    //   return Currency.COP;
    // }
    // case Country.Peru: {
    //   return Currency.PEN;
    // }
    // case Country.Venezuela: {
    //   return Currency.VES;
    // }
    // case Country.Uruguay: {
    //   return Currency.UYU;
    // }
    // case Country.Paraguay: {
    //   return Currency.PYG;
    // }
    // case Country.Bolivia: {
    //   return Currency.BOB;
    // }
    // case Country.Guyana: {
    //   return Currency.GYD;
    // }
    // case Country.Suriname: {
    //   return Currency.SRD;
    // }
    // case Country.FrenchGuiana: {
    //   return Currency.EUR;
    // }

    // // Major African countries
    // case Country.SouthAfrica: {
    //   return Currency.ZAR;
    // }
    // case Country.Nigeria: {
    //   return Currency.NGN;
    // }
    // case Country.Kenya: {
    //   return Currency.KES;
    // }
    // case Country.Ghana: {
    //   return Currency.GHS;
    // }
    // case Country.Ethiopia: {
    //   return Currency.ETB;
    // }
    // case Country.Tanzania: {
    //   return Currency.TZS;
    // }
    // case Country.Uganda: {
    //   return Currency.UGX;
    // }
    // case Country.DemocraticRepublicOfCongo: {
    //   return Currency.CDF;
    // }
    // case Country.Angola: {
    //   return Currency.AOA;
    // }
    // case Country.Mozambique: {
    //   return Currency.MZN;
    // }
    // case Country.Madagascar: {
    //   return Currency.MGA;
    // }
    // case Country.Cameroon:
    // case Country.Chad:
    // case Country.CentralAfricanRepublic:
    // case Country.EquatorialGuinea:
    // case Country.Gabon:
    // case Country.Congo: {
    //   return Currency.XAF;
    // }
    // case Country.Niger:
    // case Country.Mali:
    // case Country.BurkinaFaso:
    // case Country.Senegal:
    // case Country.Guinea:
    // case Country.SierraLeone:
    // case Country.Liberia:
    // case Country.IvoryCoast:
    // case Country.Benin:
    // case Country.Togo:
    // case Country.CapeVerde:
    // case Country.Gambia:
    // case Country.GuineaBissau:
    // case Country.SaoTomeAndPrincipe: {
    //   return Currency.XOF;
    // }
    // case Country.SouthSudan: {
    //   return Currency.SSP;
    // }
    // case Country.Eritrea: {
    //   return Currency.ERN;
    // }
    // case Country.Djibouti: {
    //   return Currency.DJF;
    // }
    // case Country.Comoros: {
    //   return Currency.KMF;
    // }
    // case Country.Seychelles: {
    //   return Currency.SCR;
    // }
    // case Country.Mauritius: {
    //   return Currency.MUR;
    // }
    // case Country.Malawi: {
    //   return Currency.MWK;
    // }
    // case Country.Zambia: {
    //   return Currency.ZMW;
    // }
    // case Country.Zimbabwe: {
    //   return Currency.ZWL;
    // }
    // case Country.Botswana: {
    //   return Currency.BWP;
    // }
    // case Country.Namibia: {
    //   return Currency.NAD;
    // }
    // case Country.Lesotho: {
    //   return Currency.LSL;
    // }
    // case Country.Eswatini: {
    //   return Currency.SZL;
    // }

    // // Major Oceania countries
    // case Country.Australia: {
    //   return Currency.AUD;
    // }
    // case Country.NewZealand: {
    //   return Currency.NZD;
    // }
    // case Country.Fiji: {
    //   return Currency.FJD;
    // }
    // case Country.PapuaNewGuinea: {
    //   return Currency.PGK;
    // }
    // case Country.SolomonIslands: {
    //   return Currency.SBD;
    // }
    // case Country.Vanuatu: {
    //   return Currency.VUV;
    // }
    // case Country.NewCaledonia:
    // case Country.FrenchPolynesia: {
    //   return Currency.XPF;
    // }
    // case Country.Samoa: {
    //   return Currency.WST;
    // }
    // case Country.Tonga: {
    //   return Currency.TOP;
    // }
    // case Country.Kiribati: {
    //   return Currency.KID;
    // }
    // case Country.Tuvalu: {
    //   return Currency.TVD;
    // }

    default: {
      return Currency.USD;
    } // Default fallback
  }
};
