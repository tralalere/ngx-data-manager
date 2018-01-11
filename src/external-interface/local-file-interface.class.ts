/**
 * Created by Christophe on 11/01/2018.
 */
import {DrupalInterface} from "./drupal-interface.class";
import {Http} from "@angular/http";
import {DataManagerService} from "../data-manager.service";
import {LocalFileInterfaceConfig} from "./local-file-interface-config.interface";
import {Observable} from "rxjs/Rx";
import {DataEntityCollection} from "../data-entity-collection.class";

export class LocalFileInterface extends DrupalInterface {

    constructor(
        http:Http,
        manager:DataManagerService,
        private localFileConf:LocalFileInterfaceConfig
    ) {
        super(http, manager);
    }

    getJsonPath(entityType:string):string {
        let extension:string = this.localFileConf.extension ? this.localFileConf.extension : "json";
        return this.localFileConf.dataDirectory + entityType + "." + extension;
    }

    loadEntityCollection(entityType:string, fields:Array<string> = null, params:Object = null):Observable<DataEntityCollection> {
        var url:string = this.getJsonPath(entityType);
        return this.http.get(url).map(this.extractEntityCollection, {entityType: entityType, manager: this.manager});
    }
}