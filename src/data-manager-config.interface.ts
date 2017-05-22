/**
 * Created by reunion on 16/05/2017.
 */
import {DrupalInterfaceConfig} from "./external-interface/drupal-interface-config.interface";
import {NodeJSInterfaceConfig} from "./external-interface/nodejs-interface-config.interface";
import {LocalStorageInterfaceConfig} from "./external-interface/local-storage-interface-config.interface";

export interface DataManagerConfig {
    defaultInterface?;
    configuration?: {
        drupal?:DrupalInterfaceConfig,
        localstorage?:LocalStorageInterfaceConfig,
        nodejs?:NodeJSInterfaceConfig
    };
    map?:{[key:string]:Object};
}