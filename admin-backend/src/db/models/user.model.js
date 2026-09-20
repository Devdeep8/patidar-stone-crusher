// src/db/models/user.model.js
export default (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    tableName: 'users',
    underscored: true,
    timestamps: true
  });

  User.associate = (models) => {
    User.hasMany(models.Session, { foreignKey: 'userId', as: 'sessions' });
  };

  return User;
};
