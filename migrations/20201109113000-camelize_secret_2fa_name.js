module.exports = {
    up: (queryInterface, Sequelize) => {
      return Promise.all([
        queryInterface.renameColumn('users', 'secret_2FA', 'secret_2_f_a'),
      ]);
    },
  
    down: (queryInterface, Sequelize) => {
      return Promise.all([
        queryInterface.renameColumn('users', 'secret_2_f_a', 'secret_2FA')
      ]);
    },
  };