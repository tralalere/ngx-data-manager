/**
 * Created by reunion on 15/05/2017.
 */
import {NgModule, ModuleWithProviders} from "@angular/core";
import {DataManagerService} from "./src/data-manager.service";
import {ConfigProvider} from "./src/config.provider";
import {DataManagerConfig} from "./src/data-manager-config.interface"

export * from "./src/data-entity-collection.class";
export * from "./src/data-entity.class";
export * from "./src/data-manager.service";
export * from "./src/data-structure.class";
export * from "./src/external-interface/drupal-interface.class";
export * from "./src/external-interface/external-interface.interface";
export * from "./src/external-interface/nodejs-interface.class";
export * from "./src/config.provider";
export * from "./src/data-manager-config.interface";
export * from "./src/manager-interface-type.enum";

export * from "./src/external-interface/drupal-interface-config.interface";
export * from "./src/external-interface/local-storage-interface-config.interface";
export * from "./src/external-interface/nodejs-interface-config.interface";

@NgModule({
    providers: [
        DataManagerService
    ]
})
export class DataManagerModule {

    static forRoot(config: DataManagerConfig): ModuleWithProviders {
        return {
            ngModule: DataManagerModule,
            providers: [
                ConfigProvider, {provide: 'config', useValue: config}
            ]
        };
    }

    static forChild(config: DataManagerConfig): ModuleWithProviders {
        return {
            ngModule: DataManagerModule,
            providers: [
                ConfigProvider, {provide: 'config', useValue: config}
            ]
        };
    }
}
