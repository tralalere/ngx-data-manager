/**
 * Created by reunion on 21/11/2016.
 */
import {DataEntity} from './data-entity.class';
import {DataManagerService} from './data-manager.service';
import {Observable} from "rxjs/Rx";
import {DataStructure} from "./data-structure.class";

export class DataEntityCollection extends DataStructure {

    dataEntities:Array<DataEntity> = [];
    entitiesObservables:Array<Observable<DataEntity>> = [];
    rawValues:Array<Object> = [];

    constructor(datas:Array<Object>, public type:string, private manager:DataManagerService) {
        super();

        this.rawValues = datas;

        for (let data of datas) {
            this.dataEntities.push(new DataEntity(data, type, manager));
        }
    }



    /**
     * Enregistre un observable
     * @param observable L'observable à enregistrer
     */
    pushObservable(observable:Observable<DataEntity>) {
        this.entitiesObservables.push(observable);
    }
    
    
    hasEntity(id:number) {
        for (let entity of this.dataEntities) {
            if (entity.id === id) {
                return true;
            }
        }
        
        return false;
    }


    // à priori inutile
    /*save() {
        this.manager.saveEntityCollection(this);
    }*/

    /**
     * Crée une nouvelle entité qu'on ajoute à la collection
     * @param datas Données de création de l'entité
     * @returns {Observable<DataEntity>} L'observable de création de l'entité
     */
    addEntity(datas:Object):Observable<DataEntity> {

        var observable:Observable<DataEntity> = this.manager.createEntity(this.type, datas);

        observable.subscribe((entity:DataEntity) => {
            this.dataEntities.push(entity);
        });

        return observable;
    }

    /**
     * Supprime une entité de la collection
     * @param entity L'entité à supprimer de la collection
     */
    removeEntity(entity:DataEntity) {
        var index = this.dataEntities.indexOf(entity);
        if (index !== -1) {
            entity.remove().subscribe(() => {
                this.dataEntities.splice(index, 1);
            });
        } else {
            console.log("Tentative de suppression d'une entité inexistante");
        }
    }


    /**
     * Propage les modification de la collection vers les collections de même type chargées séparément
     */
    propagateChanges() {
        this.manager.propagateCollectionChange(this);
    }
}