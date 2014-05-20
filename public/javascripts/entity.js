define(function() {
  var Entity = function(json) {
    this.x = (typeof json.x === 'undefined') ? 50 : json.x;
    this.y = (typeof json.x === 'undefined') ? 50 : json.y;
    this.width = (typeof json.x === 'undefined') ? 16 : json.width;
    this.height = (typeof json.x === 'undefined') ? 16 : json.height;

    // Check if this entity is colliding(bounding box collision)
    // with a given entity
    // Note: remember (x, y) is at the center of the entity
    this.collide = function(entity) {
      return (
        this.x-this.width/2 <= entity.x+entity.width/2 &&
        this.x+this.width/2 >= entity.x-entity.width/2 &&
        this.y-this.height/2 <= entity.y+entity.height/2 &&
        this.y+this.height/2 >= entity.y-entity.height/2);
    }
  }

  return Entity;
});
