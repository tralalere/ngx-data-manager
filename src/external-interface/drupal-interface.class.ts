/**
 * Created by reunion on 21/11/2016.
 */
import {ExternalInterface} from "./external-interface.interface";
import {DataEntity} from "../data-entity.class"
import {DataEntityCollection} from "../data-entity-collection.class"
import {Settings} from "../../settings/Settings.class"
import {Headers, Http, Response} from "@angular/http";
import {DataManagerService} from '../data-manager.service';
import {DrupalInterfaceConfig} from "./drupal-interface-config.interface";
import {Observable} from "rxjs/Rx";

// Operators
import 'rxjs/add/operator/map';


export class DrupalInterface implements ExternalInterface {

    constructor(
        protected http:Http,
        protected manager:DataManagerService,
        private configuration:DrupalInterfaceConfig = null
    ) {}


    /**
     * Retourne les headers nécessaire aux requêtes http
     * @returns {Headers} Les headers
     */
    protected getHeaders():Headers {
       return Settings.getHeaders();
    }


    getApiUrl(entityType:string):string {
        return this.configuration.apiUrl;
    }


    /**
     * Charge une entité depuis le serveur
     * @param entityType Type de l'entité
     * @returns {ObserverObservableCouple<DataEntity>} Couple Observable / Observer créé conséquemment à la requête http
     */
    getEntity(entityType:string):Observable<DataEntity> {

        return this.http.get(this.getApiUrl(entityType) + entityType, {
            headers: this.getHeaders()
        }).map(this.extractEntity, {entityType: entityType, manager: this.manager}).catch(this.handleError);
    }

    private handleError (error: Response | any) {
        let body = error.json() || {};
        console.log("drupal interface error");
        console.log(error);
        return Observable.throw(body);
    }

    /**
     * Charge une entité depuis le serveur
     * @param entityType Type de l'entité
     * @param entityId Id de l'entité
     * @returns {ObserverObservableCouple<DataEntity>} Couple Observable / Observer créé conséquemment à la requête http
     */
    loadEntity(entityType:string, entityId:any):Observable<DataEntity> {

        return this.http.get(this.getApiUrl(entityType) + entityType + "/" + entityId,  {
            headers: this.getHeaders()
        }).map(this.extractEntity, {entityType: entityType, manager: this.manager}).catch(this.handleError);
    }


    /**
     * Convertit la réponse serveur en entité
     * @param res Réponse à convertir
     * @returns {DataEntity} Entité de données
     */
    protected extractEntity(res: Response):DataEntity {
        let body = res.json();
        if(res.headers.get("content-type").indexOf("single") == -1) {
            return new DataEntity(body.data[0] || {}, this['entityType'], this['manager']);
        } else {
            return new DataEntity(body || {}, this['entityType'], this['manager']);
        }
    }


    /**
     * Sauve l'entité vers le serveur
     * @param entity Entité à sauvegarder
     * @returns {any} L'observable de l'entité
     */
    saveEntity(entity:DataEntity, applyDiff:boolean = true, exclusions:string[] = []):Observable<DataEntity> {

        var diff:Object;

        if (applyDiff) {
            diff = entity.diff();
        } else {
            // clone à l'arrache
            diff = JSON.parse(JSON.stringify(entity.attributes));
            if (diff["id"]) delete diff["id"];
        }

        for (let key of exclusions) {
            if (diff[key] !== undefined) {
                delete diff[key];
            }
        }

        return this.http.patch(this.getApiUrl(entity.type) + entity.type + "/" + entity.id, JSON.stringify(diff), {
                headers: this.getHeaders()
        }).map(this.extractEntity, {entityType: entity.type, manager: this.manager});
    }

    /**
     * Sauve l'entité vers le serveur SANS diff
     * @param entity Entité à sauvegarder
     * @returns {any} L'observable de l'entité
     */
    saveRawEntity(entity:DataEntity):Observable<DataEntity> {
        
        var obj:Object = entity.attributes;

        return this.http.patch(this.getApiUrl(entity.type) + entity.type + "/" + entity.id, JSON.stringify(obj), {
                headers: this.getHeaders()
        }).map(this.extractEntity, {entityType: entity.type, manager: this.manager});
    }


    /**
     * Crée une nouvelle entité sur le serveur
     * @param entityType Type de l'entité
     * @param datas Données de création
     * @returns {Observable<DataEntity>} L'observable de l'entité créée
     */
    createEntity(entityType:string, datas:Object, params:Object = null, exclusions:string[] = []):Observable<DataEntity> {

        let filteredData:Object = {};

        for (let key of Object.keys(datas)) {
            if (exclusions.indexOf(key) === -1) {
                filteredData[key] = datas[key];
            }
        }

        return this.http.post(this.getApiUrl(entityType) + entityType, JSON.stringify(filteredData), {
            headers: this.getHeaders()
        })
            .map(this.extractEntity, {entityType: entityType, manager: this.manager}).catch(this.handleError);
    }

    putEntity(entityType:string, datas:Object, params:Object = null):Observable<DataEntity> {

        return this.http.put(this.getApiUrl(entityType) + entityType, JSON.stringify(datas), {
            headers: this.getHeaders()
        })
            .map(this.extractEntity, {entityType: entityType, manager: this.manager}).catch(this.handleError);
    }


    /**
     * Suppression de l'entité du serveur
     * @param entity entité à supprimer
     * @param params
     * @returns {Observable<Response>} L'observable de suppression
     */
    deleteEntity(entity:DataEntity, params:Object = null):Observable<Response> {
        return this.http.delete(this.getApiUrl(entity.type) + entity.type + "/" + entity.id, {
            headers: this.getHeaders()
        });
    }


    /**
     * Duplique une entité sur le serveur
     * @param entity Entité à dupliquer
     * @returns {Observable<DataEntity>} L'observable à supprimer
     */
    duplicateEntity(entity:DataEntity):Observable<DataEntity> {
        return this.createEntity(entity.type, entity.getFilteredAttributes());
    }


    /**
     * Charge une collection d'entités depuis le serveur
     * @param entityType Type de collection à charger
     * @param fields
     * @param params
     * @returns {Observable<DataEntityCollection>} L'observable de la collection
     */
    loadEntityCollection(entityType:string, fields:Array<string> = null, params:Object = null):Observable<DataEntityCollection> {

        var url:string = this.getApiUrl(entityType) + entityType;

        if (fields || params) {
            url += "?";
        }

        if (fields) {
            url += "fields=";

            for (let index = 0; index < fields.length; index++) {
                url += fields[index];

                if (index < fields.length - 1) {
                    url += ",";
                }
            }

            if (params) {
                url += "&";
            }
        }

        for (let key in params) {
            if (params.hasOwnProperty(key)) {

                if (params[key] instanceof Array) {
                    var tab:string[] = params[key];

                    for (let val of tab) {
                        url += "filter[" + key + "]=" + val + "&";
                    }
                } else {
                    url += "filter[" + key + "]=" + params[key] + "&";
                }

            }
        }

        return this.http.get(url, {
            headers: this.getHeaders()
        }).map(this.extractEntityCollection, {entityType: entityType, manager: this.manager});
    }


    /**
     * Convertit la réponse du serveur en objet DataEntityCollection
     * @param res Réponse du serveur
     * @returns {DataEntityCollection} L'objet DataEntityCollection
     */
    protected extractEntityCollection(res: Response):DataEntityCollection {
        let body = res.json();
        var coll:DataEntityCollection = new DataEntityCollection(body.data || {}, this["entityType"], this.manager);
        
        return coll;
    }

    // aucune utilité !!!
    saveEntityCollection(entityCollection:DataEntityCollection):Observable<DataEntityCollection> {
        return null;
    }
    
    release() {
        
    }
}