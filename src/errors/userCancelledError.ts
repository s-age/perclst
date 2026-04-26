export class UserCancelledError extends Error {
  constructor() {
    super('Cancelled by user')
    this.name = 'UserCancelledError'
  }
}
