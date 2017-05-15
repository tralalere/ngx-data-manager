/**
 * Created by reunion on 15/05/2017.
 */
import {NgModule, ModuleWithProviders} from "@angular/core";
import {DataManagerService} from "./src/data-manager.service";

export * from "./src/data-entity-collection.class";
export * from "./src/data-entity.class";
export * from "./src/data-manager.service";
export * from "./src/data-structure.class";
export * from "./src/external-interface/drupal-interface.class";
export * from "./src/external-interface/external-interface.interface";

export interface DataManagerConfig {
}

@NgModule({
    declarations: [
        //TranslatePipe,
        //TranslateDirective
    ],
    exports: [
        //TranslatePipe,
        //TranslateDirective
    ]
})
export class DataManager {
    /**
     * Use this method in your root module to provide the TranslateService
     * @param {DataManagerConfig} config
     * @returns {ModuleWithProviders}
     */
    static forRoot(config: DataManagerConfig = {}): ModuleWithProviders {
        return {
            ngModule: DataManager,
            providers: [
                DataManagerService
            ]
        };
    }

    /**
     * Use this method in your other (non root) modules to import the directive/pipe
     * @param {DataManagerConfig} config
     * @returns {ModuleWithProviders}
     */
    static forChild(config: DataManagerConfig = {}): ModuleWithProviders {
        return {
            ngModule: DataManager,
            providers: [
                DataManagerService
            ]
        };
    }
}
