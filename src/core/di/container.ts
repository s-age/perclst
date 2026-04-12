type Identifier = string | symbol

export class Container {
  private bindings = new Map<Identifier, unknown>()

  register(id: Identifier, instance: unknown): void {
    this.bindings.set(id, instance)
  }

  resolve<T>(id: Identifier): T {
    const instance = this.bindings.get(id)
    if (instance === undefined) {
      throw new Error(`No binding found for ${String(id)}`)
    }
    return instance as T
  }
}

export const container = new Container()
