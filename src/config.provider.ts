/**
 * Created by reunion on 16/05/2017.
 */
import {Injectable, Inject} from "@angular/core";
import {DataManagerConfig} from "./data-manager-config.interface";

@Injectable()
export class ConfigProvider {

    constructor(
        @Inject('config') config:DataManagerConfig
    ) {
        this.apiUrl = config.apiUrl;
        this.managerType = config.managerType;
    }

    apiUrl:string;
    managerType;
}