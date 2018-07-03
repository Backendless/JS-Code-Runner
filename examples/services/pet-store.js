'use strict'

/**
 * @property {String} objectId
 * @property {String} name
 * @property {Number} birthday
 */
class Pet extends Backendless.ServerCode.PersistenceItem {
}

class PetStore {

  /**
   * @description List all pets
   * @route GET /
   * @returns {Promise.<Pet[]>}
   */
  getAll() {
    return Pet.find()
  }

  /**
   * @description Make a new pet
   * @route POST /
   * @param {Pet} pet The pet JSON you want to post
   * @returns {Promise.<Pet>}
   */
  create(pet) {
    return pet.save()
  }

  /**
   * @description Save pet
   * @route PUT /
   * @param {Pet} pet The pet JSON you want to save
   * @returns {Promise.<Pet>}
   */
  save(pet) {
    return pet.save()
  }

  /**
   * @description Sends the pet with pet Id
   * @route GET /{petId}
   * @returns {Promise.<Pet>}
   */
  getPet() {
    return Pet.findById(this.request.pathParams.petId)
  }

  /**
   * @typedef {Object} PetDeleteResponse
   * @property {Number} deletionTime
   */

  /**
   * @description Delete the pet by pet Id
   * @route DELETE /{petId}
   * @returns {Promise.<PetDeleteResponse>}
   */
  deletePet() {
    return Pet.remove(this.request.pathParams.petId)
  }
}

Backendless.ServerCode.addService(PetStore)