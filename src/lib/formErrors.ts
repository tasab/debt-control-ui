/**
 * Server errors carry `fields` (SERVER_PLAN §2.4); mapping them onto the form
 * puts "недостатньо коштів" under the amount input instead of in a toast the
 * user has to connect back to a field themselves.
 */
export function applyServerErrors(form, error) {
  if (error?.fields) {
    let attached = false
    for (const [field, message] of Object.entries(error.fields)) {
      // Only fields the form actually owns; the rest fall through to root.
      if (field in form.getValues()) {
        form.setError(field, { type: 'server', message })
        attached = true
      }
    }
    if (attached) return
  }
  form.setError('root', { type: 'server', message: error?.message ?? 'Не вдалося виконати' })
}
