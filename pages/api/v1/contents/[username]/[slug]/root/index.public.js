import nextConnect from 'next-connect';
import controller from 'models/controller.js';
import user from 'models/user.js';
import authorization from 'models/authorization.js';
import validator from 'models/validator.js';
import content from 'models/content.js';
import { NotFoundError } from 'errors/index.js';

export default nextConnect({
  attachParams: true,
  onNoMatch: controller.onNoMatchHandler,
  onError: controller.onErrorHandler,
})
  .use(controller.injectRequestMetadata)
  .use(controller.logRequest)
  .get(getValidationHandler, getHandler);

function getValidationHandler(request, response, next) {
  const cleanValues = validator(request.query, {
    username: 'required',
    slug: 'required',
  });

  request.query = cleanValues;

  next();
}

async function getHandler(request, response) {
  const userTryingToGet = user.createAnonymous();

  const contentFound = await content.findOne({
    where: {
      owner_username: request.query.username,
      slug: request.query.slug,
      status: 'published',
    },
  });

  if (!contentFound) {
    throw new NotFoundError({
      message: `O conteúdo informado não foi encontrado no sistema.`,
      action: 'Verifique se o "slug" está digitado corretamente.',
      stack: new Error().stack,
      errorLocationCode: 'CONTROLLER:CONTENT:ROOT:GET_HANDLER:SLUG_NOT_FOUND',
      key: 'slug',
    });
  }

  const rootContentFound = await content.findRootContent({
    where: {
      id: contentFound.id,
    },
  });

  if (!rootContentFound) {
    throw new NotFoundError({
      message: `O conteúdo requisitado já é o conteúdo raiz.`,
      action:
        'Busque apenas por conteúdos com "parent_id", pois este conteúdo não possui níveis superiores na árvore de conteúdos.',
      stack: new Error().stack,
      errorLocationCode: 'CONTROLLER:CONTENT:ROOT:GET_HANDLER:ALREADY_ROOT',
      key: 'parent_id',
    });
  }

  if (rootContentFound && rootContentFound.status !== 'published') {
    throw new NotFoundError({
      message: `O conteúdo raiz não está mais disponível publicamente.`,
      action: 'Enquanto o conteúdo raiz não possuir um status público, ele não poderá ser acessado.',
      stack: new Error().stack,
      errorLocationCode: 'CONTROLLER:CONTENT:ROOT:GET_HANDLER:ROOT_NOT_FOUND',
      key: 'status',
    });
  }

  const secureOutputValues = authorization.filterOutput(userTryingToGet, 'read:content', rootContentFound);

  return response.status(200).json(secureOutputValues);
}