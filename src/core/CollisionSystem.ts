import * as THREE from "three";

export class CollisionSystem {
  private objects: THREE.Mesh[] = [];
  private avatarRadius: number = 0.5; // Radius of the avatar's collision sphere
  private debugMode: boolean = true; // Enable debug logging
  private collisionResponse: "stop" | "slide" | "bounce" = "bounce"; // How to respond to collisions
  private pushBackDistance: number = 0.2; // How far to push back when collision is detected
  private bounceStrength: number = 0.8; // How strong the bounce back is (0-1)

  constructor() {}

  public addObject(object: THREE.Mesh): void {
    // Skip terrain objects
    if (this.isTerrain(object)) {
      if (this.debugMode) {
        console.log(`Skipping terrain object: ${object.uuid}`);
      }
      return;
    }

    this.objects.push(object);

    // Ensure the object's geometry has a computed bounding box
    if (object.geometry) {
      object.geometry.computeBoundingBox();
    }

    if (this.debugMode) {
      console.log(`Added collidable object: ${object.uuid}`);
    }
  }

  public removeObject(object: THREE.Mesh): void {
    const index = this.objects.indexOf(object);
    if (index !== -1) {
      this.objects.splice(index, 1);
      if (this.debugMode) {
        console.log(`Removed collidable object: ${object.uuid}`);
      }
    }
  }

  public setCollisionResponse(response: "stop" | "slide" | "bounce"): void {
    this.collisionResponse = response;
    if (this.debugMode) {
      console.log(`Collision response set to: ${response}`);
    }
  }

  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    console.log(
      `CollisionSystem debug mode ${enabled ? "enabled" : "disabled"}`
    );
  }

  private isTerrain(object: THREE.Mesh): boolean {
    // Check if the object has the isTerrain property
    return (object as any).isTerrain === true;
  }

  public checkCollision(
    position: THREE.Vector3,
    velocity: THREE.Vector3
  ): {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    collisionDetected: boolean;
  } {
    // Create a new position vector to store the adjusted position
    const adjustedPosition = position.clone();
    // Create a new velocity vector to store the adjusted velocity
    const adjustedVelocity = velocity.clone();
    let collisionDetected = false;

    // If there's no velocity, no need to check for collisions
    if (velocity.lengthSq() < 0.0001) {
      return {
        position: adjustedPosition,
        velocity: adjustedVelocity,
        collisionDetected,
      };
    }

    // Create a sphere for the avatar at the current position
    const avatarSphere = new THREE.Sphere(position, this.avatarRadius);

    if (this.debugMode) {
      console.log(`Checking collisions for ${this.objects.length} objects`);
    }

    // Check collision with each object
    for (const object of this.objects) {
      // Skip terrain objects
      if (this.isTerrain(object)) {
        if (this.debugMode) {
          console.log(
            `Skipping terrain object during collision check: ${object.uuid}`
          );
        }
        continue;
      }

      // Get object's bounding box
      const boundingBox = new THREE.Box3().setFromObject(object);

      // Check if the avatar sphere intersects with the object's bounding box
      if (boundingBox.intersectsSphere(avatarSphere)) {
        collisionDetected = true;

        if (this.debugMode) {
          console.log(`Collision detected with object: ${object.uuid}`);
          console.log(`Object position:`, object.position);
          console.log(`Avatar position:`, position);
        }

        // Calculate the closest point on the bounding box to the avatar
        const closestPoint = new THREE.Vector3();
        closestPoint.clamp(boundingBox.min, boundingBox.max);

        // Calculate the direction from the closest point to the avatar
        const direction = position.clone().sub(closestPoint);
        const distance = direction.length();

        // Handle the case where the avatar is inside or very close to the object
        if (distance < 0.001) {
          // If the avatar is inside the object, push it out in a default direction
          // Use the velocity direction or a default direction if velocity is too small
          const pushDirection =
            velocity.lengthSq() > 0.0001
              ? velocity.clone().normalize()
              : new THREE.Vector3(1, 0, 0);

          // Push the avatar out by the radius plus a buffer
          adjustedPosition
            .copy(closestPoint)
            .add(
              pushDirection.multiplyScalar(
                this.avatarRadius + this.pushBackDistance
              )
            );

          // Bounce the velocity in the opposite direction
          adjustedVelocity.copy(velocity).multiplyScalar(-this.bounceStrength);

          if (this.debugMode) {
            console.log(
              `Avatar inside object, pushing out in direction:`,
              pushDirection
            );
            console.log(`Bouncing velocity:`, adjustedVelocity);
          }
        } else {
          // Normalize the direction vector
          direction.normalize();

          // Calculate how much we need to move to avoid the collision
          const overlap = this.avatarRadius - distance;

          if (overlap > 0) {
            // Move the avatar away from the object
            const adjustment = direction.multiplyScalar(
              overlap + this.pushBackDistance
            );

            // Apply the adjustment
            adjustedPosition.add(adjustment);

            if (this.debugMode) {
              console.log(`Adjusting position by:`, adjustment);
              console.log(`New position:`, adjustedPosition);
            }

            // Handle collision response based on the setting
            if (this.collisionResponse === "stop") {
              // Stop the velocity in the direction of the collision
              const normalComponent = velocity.dot(direction);
              if (normalComponent < 0) {
                // Remove the component of velocity that's into the surface
                adjustedVelocity.sub(direction.multiplyScalar(normalComponent));
              }
            } else if (this.collisionResponse === "slide") {
              // Try to slide along the surface
              this.slideAlongSurface(
                adjustedPosition,
                adjustedVelocity,
                direction
              );
            } else if (this.collisionResponse === "bounce") {
              // Bounce the velocity in the opposite direction
              const normalComponent = velocity.dot(direction);
              if (normalComponent < 0) {
                // Reflect the velocity vector across the normal
                const reflection = direction
                  .clone()
                  .multiplyScalar(2 * normalComponent);
                adjustedVelocity.sub(reflection);

                // Apply bounce strength
                adjustedVelocity.multiplyScalar(this.bounceStrength);

                if (this.debugMode) {
                  console.log(`Bouncing velocity:`, adjustedVelocity);
                }
              }
            }
          }
        }
      }
    }

    if (collisionDetected && this.debugMode) {
      console.log(`Final adjusted position:`, adjustedPosition);
      console.log(`Final adjusted velocity:`, adjustedVelocity);
    }

    return {
      position: adjustedPosition,
      velocity: adjustedVelocity,
      collisionDetected,
    };
  }

  private slideAlongSurface(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    normal: THREE.Vector3
  ): void {
    // Calculate the projection of velocity onto the normal
    const dot = velocity.dot(normal);

    // If the dot product is negative, the velocity is pointing into the surface
    if (dot < 0) {
      // Calculate the slide direction by removing the component of velocity that's into the surface
      const slideDirection = velocity.clone().sub(normal.multiplyScalar(dot));

      // If the slide direction is significant, apply it
      if (slideDirection.lengthSq() > 0.0001) {
        // Normalize and scale by a small amount to allow sliding
        slideDirection.normalize().multiplyScalar(velocity.length() * 0.5);

        // Apply the slide
        position.add(slideDirection);

        if (this.debugMode) {
          console.log(`Sliding along surface by:`, slideDirection);
        }
      }
    }
  }
}
