/**
 * Created by reunion on 29/11/2016.
 */
export class DataStructure {

    /**
     * Clone un objet complet, de manière profonde (c'est à dire son arborescence complete)
     * @param objectToClone Comme son nom l'indique...
     * @returns {{}} Le Clone
     */
    clone(objectToClone:Object):Object {

        var cloneObj = {};

        for (var key in objectToClone) {

            if (objectToClone.hasOwnProperty(key)) {

                if (typeof objectToClone[key] === "object") {
                    cloneObj[key] = this.clone(objectToClone[key]);
                } else {
                    cloneObj[key] = objectToClone[key];
                }
            }
        }

        return cloneObj;
    }

    /**
     * Teste récursivement si un objet est vide (vide si aucune de ses branches ne possède de valeur)
     * @param object Objet auquel s'applique le test
     * @returns {boolean} Vrai si vide, sinon faux
     */
    isEmpty(object:Object):boolean {
        return Object.keys(object).length === 0;
    }


    /**
     * Supprime toutes les branches vides d'un objet
     * @param objectToClean Objet à nettoyer
     * @returns {Object} L'objet nettoyé (attention, l'objet n'est pas copié, mais passé par référence)
     */
    cleanObject(objectToClean:Object):Object {

        /*for (let key in objectToClean) {
            if (objectToClean.hasOwnProperty(key) && (typeof key === "string") && key !== "0") {

                if (this.isEmpty(objectToClean[key])) {
                    delete objectToClean[key];
                } else {
                    this.cleanObject(objectToClean[key]);
                }
            }
        }*/

        return objectToClean;
    }

    /**
     * Retourne le diff non nettoyé entre l'objet reference et updated (valeurs modifiées de updated par rapport à reference
     * @param reference L'objet de référence
     * @param updated L'objet mis à jour
     * @returns {{}} Le diff
     */
    applyDiff(reference:Object, updated:Object):Object {

        var diffObject = {};

        for (var key in reference) {

            if (reference.hasOwnProperty(key)) {

                let refVal:string = JSON.stringify(reference[key]);

                if (updated[key]) {
                    let updVal:string = JSON.stringify(updated[key]);

                    if (refVal !== updVal) {
                        diffObject[key] = updated[key];
                    }
                }
            }
        }

        for (var key in updated) {

            if (updated.hasOwnProperty(key)) {

                if (reference[key] === undefined) {
                    diffObject[key] = updated[key];
                }
            }
        }
        return diffObject;
    }

    /**
     * Retourne le diff nettoyé (objet ne contenant que les propriétés de updated différentes de celle de reference
     * @param reference L'objet de référence
     * @param updated L'objet mis à jour
     * @returns {Object} Le diff
     */
    getDiff(reference:Object, updated:Object):Object {
        var incompleteDiff:Object = this.applyDiff(reference, updated);
        return this.cleanObject(incompleteDiff);
    }
}