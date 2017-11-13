/**
 * Created by reunion on 16/05/2017.
 */
import {DrupalInterfaceConfig} from "./external-interface/drupal-interface-config.interface";
import {NodeJSInterfaceConfig} from "./external-interface/nodejs-interface-config.interface";
import {LocalStorageInterfaceConfig} from "./external-interface/local-storage-interface-config.interface";
import {ExternalInterface} from "./external-interface/external-interface.interface";

export interface DataManagerConfig {
    defaultInterface?:string;
    configuration?: {
        drupal?:DrupalInterfaceConfig,
        localstorage?:LocalStorageInterfaceConfig,
        nodejs?:NodeJSInterfaceConfig
    };
    declarations?: {[key:string]: {
        interfaceType:string,
        configuration:DrupalInterfaceConfig|LocalStorageInterfaceConfig|NodeJSInterfaceConfig|ExternalInterface
    }},
    map?:{[key:string]:string};
    nesting?:{[key:string]:{[key:string]:any}};

    // ajout d'une liste des entités pour lesquelles le cache sera utilisé

    // déclaration des structures d'objet


}