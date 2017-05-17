/**
 * Created by Christophe on 25/11/2016.
 */
import { Injectable } from '@angular/core';
import { Http, Response } from '@angular/http';
import { DataEntity } from './data-entity.class';
import { DataEntityCollection } from './data-entity-collection.class';
import { DrupalInterface } from './external-interface/drupal-interface.class';
import { LocalStorageInterface } from './external-interface/local-storage-interface.class';
import { ExternalInterface } from './external-interface/external-interface.interface';
import {Observable} from "rxjs/Rx";
import {ReplaySubject} from "rxjs/Rx";
import {ConfigProvider} from "./config.provider";
import {ManagerInterfaceTypes} from "./manager-interface-type.enum";
import 'rxjs/add/operator/filter';


@Injectable()
export class DataManagerService {

    private externalInterface:ExternalInterface;
    entitiesCollectionsCache:{[key:string]:DataEntityCollection} = {};
    entitiesCollectionsSubjects:{[key:string]:ReplaySubject<DataEntityCollection>} = {};
    pendingCollectionsSubjects:{[key:string]:ReplaySubject<DataEntityCollection>} = {};
    entitiesSubjects:{[key:number]:ReplaySubject<DataEntity>} = {};
    pendingEntitiesSubjects:{[key:number]:ReplaySubject<DataEntity>} = {};

    constructor(
        http:Http,
        public configProvider:ConfigProvider
    ) {
        if (configProvider.managerType === ManagerInterfaceTypes.DRUPAL) {
            this.externalInterface = new DrupalInterface(http, this);
        } else if (configProvider.managerType === ManagerInterfaceTypes.LOCALSTORAGE) {
            this.externalInterface = new LocalStorageInterface(this);
        }

        this.entitiesCollectionsCache = {};
    }


    /**
     * Charge une collection d'entités
     * @param entityType Type d'entité à charger
     * @param forceLoading Force le chargement depuis provider de données (pas de cache front)
     * @param fields
     * @returns {Observable<DataEntityCollection>} L'observable de chargement
     */
    loadEntityCollection(entityType:string, forceLoading:boolean = false, fields:Array<string> = null):Observable<DataEntityCollection> {

        var subject:ReplaySubject<DataEntityCollection>;
        var tSubject:ReplaySubject<DataEntityCollection> = new ReplaySubject<DataEntityCollection>(1);

        if (!this.entitiesCollectionsSubjects[entityType] || forceLoading) {

            subject = new ReplaySubject<DataEntityCollection>(1);
            this.registerEntityCollectionSubject(entityType, subject);
            this.pendingCollectionsSubjects[entityType] = subject;

            this.externalInterface.loadEntityCollection(entityType, fields)
                .map(this.addTest, this)
                .subscribe((collection:DataEntityCollection) => {

                    this.entitiesCollectionsCache[entityType] = collection;
                    this.registerEntityCollection(collection, subject);
                    delete (this.pendingCollectionsSubjects[entityType]);
                    subject.next(collection);
                    tSubject.next(collection);
                });

        } else {

            subject = this.entitiesCollectionsSubjects[entityType];

            if (!this.entitiesCollectionsCache[entityType] && !this.pendingCollectionsSubjects[entityType]) {

                this.pendingCollectionsSubjects[entityType] = subject;

                this.externalInterface.loadEntityCollection(entityType, fields)
                    .map(this.addTest, this)
                    .subscribe((collection:DataEntityCollection) => {
                        this.entitiesCollectionsCache[entityType] = collection;
                        this.registerEntityCollection(collection, subject);
                        delete (this.pendingCollectionsSubjects[entityType]);
                        subject.next(collection);
                        tSubject.next(collection);
                    });

            } else {
                return subject;
            }

        }

        return tSubject;
    }


    /**
     * Charge une entité de données
     * @param entityType Type d'entité
     * @param entityId Id de l'entité
     * @param forceLoading Force le chargement depuis le provider de données (pas de cache front)
     * @returns {Observable<DataEntity>} L'observable de chargement
     */
    loadEntity(entityType:string, entityId:any, forceLoading:boolean = false):Observable<DataEntity> {

        var subject:ReplaySubject<DataEntity>;
        var tSubject:ReplaySubject<DataEntity> = new ReplaySubject<DataEntity>(1);

        if (!this.entitiesSubjects[entityId] || forceLoading) {

            subject = new ReplaySubject<DataEntity>(1);
            this.pendingEntitiesSubjects[entityId] = subject;

            this.registerEntitySubject(entityId, subject);

            this.externalInterface.loadEntity(entityType, entityId)
                .subscribe((entity:DataEntity) => {
                        subject.next(entity);
                        tSubject.next(entity);
                        delete this.pendingEntitiesSubjects[entityId];
                        this.registerEntity(entity, subject);

                    },
                    (error:Object) => {
                        //subject.error(error);
                        console.log(error);
                    });

        } else {
            subject = this.entitiesSubjects[entityId];

            if ((!this.entitiesCollectionsCache[entityType] || !this.entitiesCollectionsCache[entityType].hasEntity(entityId)) && !this.pendingEntitiesSubjects[entityId]) {

                this.pendingEntitiesSubjects[entityId] = subject;

                this.externalInterface.loadEntity(entityType, entityId)
                    .subscribe((entity:DataEntity) => {
                            subject.next(entity);
                            tSubject.next(entity);
                            this.registerEntity(entity, subject);
                            delete this.pendingEntitiesSubjects[entityId];

                        },
                        (error:Object) => {
                            //subject.error(error);
                            console.log(error);
                        });

            } else {
                return subject;
            }
        }
        
        return tSubject;
    }

    getEntity(entityType:string, forceLoading:boolean = false):Observable<DataEntity> {

        var subject:ReplaySubject<DataEntity>;

        if (!this.entitiesSubjects[entityType] || forceLoading) {

            subject = new ReplaySubject<DataEntity>(1);

            this.externalInterface.getEntity(entityType)
                .subscribe((entity:DataEntity) => {
                        subject.next(entity);
                        this.registerEntity(entity, subject);
                    },
                    (error:Object) => {
                        subject.error(error);
                    });
        } else {
            subject = this.entitiesSubjects[entityType];

            if (!this.entitiesCollectionsCache[entityType]) {

                this.externalInterface.getEntity(entityType)
                    .subscribe((entity:DataEntity) => {
                            subject.next(entity);
                            this.registerEntity(entity, subject);

                        },
                        (error:Object) => {
                            subject.error(error);
                        });
            }
        }

        return subject;
    }


    addTest(collection:DataEntityCollection):DataEntityCollection {
        return collection;
    }

    /**
     * On propage les changements vers les observables des entités de même id
     * @param entity L'entité à propager
     */
    propagateEntityChange(entity:DataEntity) {
        if (this.entitiesSubjects[entity.id]) {
            this.entitiesSubjects[entity.id].next(entity);
        }
    }


    /**
     * Propage les modifications de la collection vers les autres collection de même type
     * @param collection La collection à propager
     */
    propagateCollectionChange(collection:DataEntityCollection) {
        if (this.entitiesCollectionsSubjects[collection.type]) {
            this.entitiesCollectionsSubjects[collection.type].next(collection);
        }
    }


    /**
     * Sauvegarde les donnnées d'une entitée vers le provider de données
     * @param entity L'entité à sauvegarder
     * @param propagateChanges
     * @returns {Observable<DataEntity>} L'observable de sauvegarde
     */
    saveEntity(entity:DataEntity, propagateChanges:boolean = true, raw:boolean = false, applyDiff:boolean = true):Observable<DataEntity> {

        var subject:ReplaySubject<DataEntity>;

        if (this.entitiesSubjects[entity.id]) {
            subject = this.entitiesSubjects[entity.id];
        } else {
            subject = new ReplaySubject<DataEntity>(1);
        }

        if(!raw) {
            if (entity.hasChanged() || !applyDiff) {
                this.externalInterface.saveEntity(entity, applyDiff).subscribe((entity:DataEntity) => {
                    if (propagateChanges) {
                        this.propagateEntityChange(entity);
                    }

                    subject.next(entity);
                });
            } else {
                subject.next(entity);
            }
        } else {
            this.externalInterface.saveRawEntity(entity).subscribe((entity: DataEntity) => {
                subject.next(entity);
            });
        }

        return subject;
    }


    /**
     * Crée une nouvelle entité d'un type donné dans le provider de données
     * @param entityType Type de l'entité à créer
     * @param datas Données d'initialisation
     * @returns {Observable<DataEntity>} L'observable de création
     */
    createEntity(entityType:string, datas:Object):Observable<DataEntity> {

        var subject:ReplaySubject<DataEntity> = new ReplaySubject<DataEntity>(1);

        this.externalInterface.createEntity(entityType, datas)
            .subscribe((entity:DataEntity) => {
                    this.registerEntity(entity, subject);
                    subject.next(entity);

                    if (this.entitiesCollectionsCache[entityType]) {
                        this.entitiesCollectionsCache[entityType].dataEntities.push(entity);
                    }

                    this.nextOnCollection(entityType);
                },
                (error:Object) => {
                    subject.error(error);
                });

        return subject;
    }

    putEntity(entityType:string, datas:Object):Observable<DataEntity> {

        var subject:ReplaySubject<DataEntity> = new ReplaySubject<DataEntity>(1);

        this.externalInterface.putEntity(entityType, datas)
            .subscribe((entity:DataEntity) => {
                    this.registerEntity(entity, subject);
                    subject.next(entity);

                    if (this.entitiesCollectionsCache[entityType]) {
                        this.entitiesCollectionsCache[entityType].dataEntities.push(entity);
                    }

                    this.nextOnCollection(entityType);
                },
                (error:Object) => {
                    subject.error(error);
                });

        return subject;
    }


    nextOnCollection(entityType) {
        if (this.entitiesCollectionsSubjects[entityType] && this.entitiesCollectionsCache[entityType]) {
            this.entitiesCollectionsSubjects[entityType].next(this.entitiesCollectionsCache[entityType]);
        }
    }


    /**
     * Supprime une entité dans le provider de données
     * @param entity Entité à supprimer
     * @returns {Observable<Response>} L'observable de suppression
     */
    deleteEntity(entity:DataEntity):Observable<Response> {

        var subject:ReplaySubject<Response> = new ReplaySubject<Response>(1);

        var observable:Observable<Response> = this.externalInterface.deleteEntity(entity);
        observable.subscribe((response:Response) => {
            subject.next(response);
            this.unregisterEntity(entity);

            if (this.entitiesCollectionsCache[entity.type]) {
                let index:number = this.entitiesCollectionsCache[entity.type].dataEntities.indexOf(entity);

                if (index !== -1) {
                    this.entitiesCollectionsCache[entity.type].dataEntities.splice(index, 1);
                    this.nextOnCollection(entity.type);
                }
            }
        });

        return subject;
    }


    /**
     * Duplique une entité dans le provider de données
     * @param entity L'entité à dupliquer
     * @returns {Observable<DataEntity>} L'observable de création de l'entité
     */
    duplicateEntity(entity:DataEntity):Observable<DataEntity> {

        // TODO: à terminer

        //var couple:ObserverObservableCouple<DataEntity> = this.externalInterface.duplicateEntity(entity);
        //couple.observable.subscribe((createdEntity:DataEntity) => this.registerEntity(createdEntity, couple.observable, couple.observer));
        //return couple.observable;

        return null;
    }


    registerEntitySubject(entityId:number, subject:ReplaySubject<DataEntity>) {
        if (!this.entitiesSubjects[entityId]) {
            this.entitiesSubjects[entityId] = subject;
        }
    }


    /**
     * Enregistre un entité en cache
     * @param entity L'entité à mettre en cache
     * @param entityObservable L'observable de cette entité
     * @param observer L'observer de cette entité
     */
    registerEntity (entity:DataEntity, entityObservable:ReplaySubject<DataEntity>) {
        if (entity === undefined) return;

        if (!this.entitiesSubjects[entity.id]) {
            this.entitiesSubjects[entity.id] = entityObservable;
        }
    }


    /**
     * Supprime l'entité du cache
     * @param entity L'entité à supprimer du cache
     */
    unregisterEntity(entity:DataEntity) {
        if (this.entitiesSubjects[entity.id]) {
            delete this.entitiesSubjects[entity.id];
        }
    }


    registerEntityCollectionSubject(collectionType:string, subject:ReplaySubject<DataEntityCollection>) {
        if (!this.entitiesCollectionsSubjects[collectionType]) {
            this.entitiesCollectionsSubjects[collectionType] = subject;
        }
    }


    /**
     * Enregistre une collection d'entités dans le cache
     * @param collection La collection à enregistrer dans le cache
     * @param entityCollectionObservable L'observable de la collection
     */
    registerEntityCollection (collection:DataEntityCollection, entityCollectionObservable:ReplaySubject<DataEntityCollection>) {

        this.registerEntityCollectionSubject(collection.type, entityCollectionObservable);

        for (let entity of collection.dataEntities) {
            var subject:ReplaySubject<DataEntity>;

            subject = new ReplaySubject<DataEntity>(1);
            collection.pushObservable(subject);
            this.registerEntity(entity, subject);
            subject.next(entity);

        }
    }
}