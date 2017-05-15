import {Headers} from "@angular/http";
/**
 * Created by reunion on 21/11/2016.
 */
export class Settings {

    static apiUrl = "https://adphile.api.tralalere.com/api/";
    static accessToken: string = "";
    static headers:Headers = new Headers();

    constructor() {
        throw new Error("Cannot new this class");
    }

    static getHeaders():Headers {
        this.addHeader("Content-Type", "application/json");
        return Settings.headers;
    }

    static addHeader(key:any, value:any) {
        Settings.headers.set(key, value);
    }

    static removeHeader(key:any) {
        Settings.headers.delete(key);
    }
}