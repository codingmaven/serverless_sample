require('dotenv/config');

const { UserRepository } = require('../../repositories/user.repository');
const { withStatusCode } = require('../../utils/response.util');
const { parseWith } = require('../../utils/request.util');
const { withProcessEnv } = require('../../dynamodb.factory');
const { canAccess } = require('../../utils/user.util');

const docClient = withProcessEnv(process.env)();
const repository = new UserRepository(docClient);
const ok = withStatusCode(200);
const badRequest = withStatusCode(400);
const notFound = withStatusCode(404);
const parseJson = parseWith(JSON.parse);

exports.handler = async (event) => {
  const { body, pathParameters } = event;
  const { id } = pathParameters;

  const user = JSON.parse(event.requestContext.authorizer.user);
  if (!canAccess(user, 'update', id)) {
    return withStatusCode(403)();
  }

  const existingContact = await repository.get(id);
  const contact = parseJson(body);

  if (!existingContact) {
    return notFound();
  }

  if (existingContact.id !== contact.id) {
    return badRequest();
  }

  // todo: merge or overwrite?
  const updatedContact = Object.assign({}, existingContact, contact);

  await repository.put(updatedContact);

  return ok(updatedContact);
};
