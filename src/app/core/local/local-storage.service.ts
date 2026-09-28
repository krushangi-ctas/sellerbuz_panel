import { Injectable } from "@angular/core";
import { StorageService } from "./storage.service";

@Injectable({
  providedIn: "root",
})
export class LocalStorageService {
  constructor(private storage: StorageService) {}
  /**Creates HASH of the key
   * @param key string
   * @returns string
   */
  hash(key: string): string {
    return this.storage.hash(key);
  }

  /**
   * This function sets an encrypted data in the local storage using a hashed key and JSON data.
   *
   * @param key - The key parameter is a string that represents the name of the key to be set in
   * the local storage. It is used to identify the data that is being stored.
   * @param data - "data" is the information that needs to be stored in the local storage. It can
   * be any type of data such as a string, number, boolean, object, or array. The data is converted
   * to a JSON string using the `JSON.stringify()` method before being stored in the local storage.
   */
  setItem(key: string, data: any): void {
    const key_hash = this.hash(key);
    const json = JSON.stringify({ data });
    localStorage.setItem(key_hash, this.storage.encrypt(json));
  }

  /**
   * This function retrieves an item from local storage by its key, decrypts it, and returns it as a
   * parsed JSON object.
   *
   * @param key - The `key` parameter is a string representing the key of the item to be
   * retrieved from local storage.
   * @returns The parsed value of the decrypted item stored in the local storage with the given key.
   * The returned value could be of any data type.
   */
  getItem(key: string): any {
    const key_hash = this.hash(key);
    const is_stored = localStorage.getItem(key_hash);
    if (!is_stored) {
      return;
    }
    try {
      const decrypted = this.storage.decrypt(is_stored);
      return JSON.parse(decrypted)["data"] || null;
    } catch (error) {
      localStorage.removeItem(key_hash);
      return null;
    }
  }

  /**
   * This function removes an item from local storage based on a given key.
   *
   * @param key - The key parameter is a string that represents the name of the item to be
   * removed from the localStorage. It is used to identify the item that needs to be removed.
   */
  removeItem(key: string): void {
    const key_hash = this.hash(key);
    localStorage.removeItem(key_hash);
  }

  /**
   * This function removes items from local storage based on the provided keys.
   *
   * @param key - The parameter `key` is an array of strings that represent the keys of the items
   * to be removed from the local storage. The function iterates over each key in the array and
   * removes the corresponding item from the local storage using the `removeItem` method.
   */
  removeItems(key: string[]): void {
    key.forEach((k) => {
      localStorage.removeItem(this.hash(k));
    });
  }

  /**
   * The function clears all data stored in the local storage.
   */
  clear(): void {
    localStorage.clear();
  }
}
