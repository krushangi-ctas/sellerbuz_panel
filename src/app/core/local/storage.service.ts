import { Injectable } from "@angular/core";
import * as CryptoJS from "crypto-js";
import { environment } from "environments/environment";

@Injectable({
  providedIn: "root",
})
export class StorageService {
  SECRET_KEY = environment.SECRET_KEY;
  constructor() {}
  hash(key: string): string {
    const key_sha = CryptoJS.SHA256(key);
    return key_sha.toString();
  }

  // Encrypt the localstorage data
  encrypt(data: string): string {
    const data_encrypt = CryptoJS.AES.encrypt(data, this.SECRET_KEY);
    data = data_encrypt.toString();
    return data;
  }

  // Decrypt the encrypted data
  decrypt(data: string): string {
    const data_decrypt = CryptoJS.AES.decrypt(data, this.SECRET_KEY);
    data = data_decrypt.toString(CryptoJS.enc.Utf8);
    return data;
  }
}
