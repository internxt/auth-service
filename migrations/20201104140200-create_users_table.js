module.exports = {
    up: (queryInterface, Sequelize) => {
      return queryInterface.createTable('users', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          allowNull: false,
          autoIncrement: true,
        },
        uuid: {
            type: Sequelize.STRING,
            unique: true
        },
        user_id: {
          type: Sequelize.STRING,
        },
        name: {
          type: Sequelize.STRING,
        },
        lastname: {
          type: Sequelize.STRING,
        },
        email: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        password: {
          type: Sequelize.BLOB('medium'),
          allowNull: false,
        },
        mnemonic: {
          type: Sequelize.BLOB('medium'),
        },
        error_login_count: {
            type: Sequelize.INTEGER
        },
        h_key: {
            type: Sequelize.BLOB('medium'),
            allowNull: false
        },
        secret_2FA: {
            type: Sequelize.STRING
        },
        referral: {
            type: Sequelize.STRING,
            defaultValue: null
        }
      });
    },
  
    down: (queryInterface, Sequelize) => {
      return queryInterface.dropTable('users');
    },
  };