module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define(
      'users',
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          allowNull: false,
          autoIncrement: true
        },
        uuid: {
          type: DataTypes.STRING(36),
          unique: true
        },
        userId: {
          type: DataTypes.STRING(60)
        },
        name: {
          type: DataTypes.STRING
        },
        lastname: {
          type: DataTypes.STRING
        },
        email: {
          type: DataTypes.STRING,
          allowNull: false
        },
        password: {
          type: DataTypes.STRING
        },
        mnemonic: {
          type: DataTypes.STRING
        },
        hKey: {
          type: DataTypes.STRING,
          allowNull: false
        },
        secret_2FA: {
          type: DataTypes.STRING
        },
        errorLoginCount: {
          type: DataTypes.INTEGER
        },
        referral: {
          type: DataTypes.STRING,
          allowNull: true
        }
      },
      {
        timestamps: true,
        underscored: true
      },
      {
        defaultScope: {
          attributes: { exclude: ['userId'] }
        }
      }
    );
  
    User.associate = function (models) {
      User.hasMany(models.folder);
    };
  
    return User;
  };