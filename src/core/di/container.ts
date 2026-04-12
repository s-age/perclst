type Identifier<T> = string | symbol

export class Container {
  private bindings = new Map<Identifier<any>, any>()

  register<T>(id: Identifier<T>, instance: T): void {
    this.bindings.set(id, instance)
  }

  resolve<T>(id: Identifier<T>): T {
    const instance = this.bindings.get(id)
    if (!instance) {
      throw new Error(`No binding found for ${String(id)}`)
    }
    return instance
  }
}

export const container = new Container()
