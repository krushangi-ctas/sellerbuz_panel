import { Injectable } from "@angular/core";
import { StorageService } from "./storage.service";

@Injectable({
  providedIn: "root",
})
export class SessionStorageService {
  constructor(private storage: StorageService) {}
  /**Creates HASH of the key
   * @param key string
   * @returns string
   */
  hash(key: string): string {
    return this.storage.hash(key);
  }

  /**
   * This function sets an encrypted data in the session storage using a hashed key and JSON data.
   *
   * @param key - The key parameter is a string that represents the name of the key to be set in
   * the session storage. It is used to identify the data that is being stored.
   * @param data - "data" is the information that needs to be stored in the session storage. It can
   * be any type of data such as a string, number, boolean, object, or array. The data is converted
   * to a JSON string using the `JSON.stringify()` method before being stored in the session storage.
   */
  setItem(key: string, data: any): void {
    const key_hash = this.hash(key);
    const json = JSON.stringify({ data });
    sessionStorage.setItem(key_hash, this.storage.encrypt(json));
  }

  /**
   * This function retrieves an item from session storage by its key, decrypts it, and returns it as a
   * parsed JSON object.
   *
   * @param key - The `key` parameter is a string representing the key of the item to be
   * retrieved from session storage.
   * @returns The parsed value of the decrypted item stored in the session storage with the given key.
   * The returned value could be of any data type.
   */
  getItem(key: string): any {
    const key_hash = this.hash(key);
    const is_stored = sessionStorage.getItem(key_hash);
    if (!is_stored) {
      return;
    }
    const decrypted = this.storage.decrypt(is_stored);
    return JSON.parse(decrypted)["data"] || null;
  }

  /**
   * This function removes an item from session storage based on a given key.
   *
   * @param key - The key parameter is a string that represents the name of the item to be
   * removed from the sessionStorage. It is used to identify the item that needs to be removed.
   */
  removeItem(key: string): void {
    const key_hash = this.hash(key);
    sessionStorage.removeItem(key_hash);
  }

  /**
   * This function removes items from session storage based on the provided keys.
   *
   * @param key - The parameter `key` is an array of strings that represent the keys of the items
   * to be removed from the session storage. The function iterates over each key in the array and
   * removes the corresponding item from the session storage using the `removeItem` method.
   */
  removeItems(key: string[]): void {
    key.forEach((k) => {
      sessionStorage.removeItem(this.hash(k));
    });
  }

  /**
   * The function clears all data stored in the session storage.
   */
  clear(): void {
    sessionStorage.clear();
  }
}
