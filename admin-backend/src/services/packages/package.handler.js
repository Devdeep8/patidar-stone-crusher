// src/services/packages/package.handler.js
import { BaseHandler } from '@src/libs/base.handler.js';
import { AppError } from '@src/errors/app.error.js';

const PACKAGE_ATTRIBUTES_EXCLUDE = ['createdAt', 'updatedAt', 'deletedAt'];

export class GetPackagesHandler extends BaseHandler {
  /**
   * List packages with pagination and optional filters.
   */
  async run() {
    const { Package } = this.context.models;
    const { page = 1, limit = 10, isActive } = this.args;

    const where = {};
    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    const { rows, count } = await Package.findAndCountAll({
      where,
      limit,
      offset: (page - 1) * limit,
      order: [['sortOrder', 'ASC'], ['id', 'ASC']],
      attributes: { exclude: PACKAGE_ATTRIBUTES_EXCLUDE }
    });

    return {
      items: rows,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  }
}

export class GetPackageByIdHandler extends BaseHandler {
  async run() {
    const { Package } = this.context.models;
    const { id } = this.args;

    const pkg = await Package.findByPk(id, {
      attributes: { exclude: PACKAGE_ATTRIBUTES_EXCLUDE }
    });

    if (!pkg) {
      throw AppError.notFound('Package not found', { meta: { resourceId: id } });
    }

    return pkg;
  }
}

export class CreatePackageHandler extends BaseHandler {
  /**
   * Keep the raw payload out of logs (it can be large).
   */
  static sanitizeArgs(args) {
    return { name: args.name, title: args.title };
  }

  async run() {
    const { Package } = this.context.models;

    const pkg = await Package.create(this.args, { transaction: this.dbTransaction });

    this.logger.info('Package created', {
      category: 'business',
      packageId: pkg.id,
      name: pkg.name
    });

    return pkg;
  }
}

export class UpdatePackageHandler extends BaseHandler {
  static sanitizeArgs(args) {
    return { id: args.id, fields: Object.keys(args).filter(key => key !== 'id') };
  }

  async run() {
    const { Package } = this.context.models;
    const { id, ...updates } = this.args;

    const [updatedCount] = await Package.update(updates, {
      where: { id },
      transaction: this.dbTransaction
    });

    if (updatedCount === 0) {
      throw AppError.notFound('Package not found', { meta: { resourceId: id } });
    }

    const pkg = await Package.findByPk(id, {
      attributes: { exclude: PACKAGE_ATTRIBUTES_EXCLUDE },
      transaction: this.dbTransaction
    });

    this.logger.info('Package updated', {
      category: 'business',
      packageId: id,
      fields: Object.keys(updates)
    });

    return pkg;
  }
}

export class DeletePackageHandler extends BaseHandler {
  async run() {
    const { Package } = this.context.models;
    const { id } = this.args;

    // Soft delete (paranoid model)
    const deletedCount = await Package.destroy({
      where: { id },
      transaction: this.dbTransaction
    });

    if (deletedCount === 0) {
      throw AppError.notFound('Package not found', { meta: { resourceId: id } });
    }

    this.logger.info('Package soft-deleted', {
      category: 'business',
      packageId: id
    });

    return { id, deleted: true };
  }
}
