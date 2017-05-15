/**
 * Created by reunion on 18/11/2016.
 */
import {DataManagerService } from './data-manager.service';
import {Observable, ReplaySubject} from "rxjs/Rx";
import {DataStructure} from "./data-structure.class";
import {Response} from "@angular/http";

export class DataEntity extends DataStructure {

    attributes: Object = {};
    referenceObject:Object;
    type:string;
    id:number;
    manager:DataManagerService;

    constructor (
        data:Object,
        type:string,
        manager:DataManagerService,
        public temporary:boolean = false
    ) {
        super();
        this.attributes = data;
        this.type = type;
        this.manager = manager;

        if (!temporary) {
            this.id = +data["id"];
        }

        this.createReferenceObject();
    }

    /**
     * Création l'objet de réference qui servira pour les diff
     */
    createReferenceObject() {
        this.referenceObject = this.clone(this.attributes);
    }


    /**
     * Mise à jour d'une propriété de l'entité
     * @param attributeName
     * @param value
     */
    set(attributeName:string, value:any, force:boolean = false) {

        if (this.attributes[attributeName] !== undefined || force) {
            this.attributes[attributeName] = value;
        } else {
            console.log("L'attribut " + attributeName + " n'existe pas au sein de cet objet.");
        }
    }


    get(attributeName:string):any {

        if (this.attributes[attributeName] !== undefined) {
            return this.attributes[attributeName];
        }

        console.log("L'attribut " + attributeName + " n'existe pas au sein de cet objet.");
        return null;
    }


    /**
     * Clone l'entité
     * @returns {DataEntity}
     */
    copy():DataEntity {
        var attributes:Object = JSON.parse(JSON.stringify(this.attributes));

        for (let id in attributes) {
            if (attributes.hasOwnProperty(id) && attributes[id] === null) {
                delete attributes[id];
            }
        }

        if (attributes["id"]) delete attributes["id"];
        if (attributes["self"]) delete attributes["self"];

        var entity:DataEntity = new DataEntity(attributes, this.type, this.manager, true);

        return entity;
    }


    /**
     * Retourne les attributs de l'entité, moins certaines valeurs passées dans une blacklist
     * @param keysBlackList BlackList de propriétés à supprimer
     * @returns {Object} Les attributs, moins les propriétés de la blacklist
     */
    getFilteredAttributes(keysBlackList:Array<string> = ["id", "self"]):Object {
        var filteredObject:Object = {};

        for (let key in this.attributes) {
            if (this.attributes.hasOwnProperty(key) && keysBlackList.indexOf(key) === -1) {
                filteredObject[key] = this.attributes[key];
            }
        }

        return filteredObject;
    }


    hasChanged():boolean {
        var changes:Object = this.diff();
        return !this.isEmpty(changes);
    }


    /**
     * Sauvegarde l'entité dans le provider de données
     * @returns {Observable<DataEntity>} L'observer de l'objet
     */
    save(applyDiff:boolean = true):Observable<DataEntity> {

        var observable:Observable<DataEntity>;

        if (!this.temporary) {
            // l'entité existe déjà dans l'api
            observable = this.manager.saveEntity(this, true, false, applyDiff);
            observable.subscribe(() => this.createReferenceObject());
            return observable;
        } else {
            // l'entité n'existe pas, elle reste à créer
            var subject:ReplaySubject<DataEntity> = new ReplaySubject<DataEntity>(1);
            observable = this.manager.createEntity(this.type, this.attributes);
            observable.subscribe((data:DataEntity) => {
                this.id = data.id;
                console.log("nouvel id", this.id, this);
                this.attributes = data.attributes;
                this.createReferenceObject();
                this.temporary = false;
                subject.next(this);
            });

            return subject;
        }
    }


    /**
     * Supprimé l'entité du provider de données
     * @returns {Observable<Response>} L'observable de suppression
     */
    remove():Observable<Response> {
        return this.manager.deleteEntity(this);
    }


    /**
     * Duplique l'objet dans le provider de données
     * @returns {Observable<DataEntity>} L'observable de duplication
     */
    duplicate():Observable<DataEntity> {
        return this.manager.duplicateEntity(this);
    }


    /**
     * Retourne le diff entre l'objet de référence et les attributs mis à jour
     * @returns {Object} Le diff
     */
    diff() {
        return this.getDiff(this.referenceObject, this.attributes);
    }


    /**
     * Propage les modification de l'entité vers les entités de même id chargées séparément
     */
    propagateChanges() {
        this.manager.propagateEntityChange(this);
    }
}