// We need a table that can represent votes and ideas. Probably have an idea
// table and have a foreign key column in Vote table that maps to an idea.
// Vote: columns ID, created_at, idea_id, user_id



// Everything below is template from ChatGPT

// module.exports = (sequelize, DataTypes) => {
//     const User = sequelize.define('User', {
//       username: {
//         type: DataTypes.STRING,
//         allowNull: false,
//       },
//       email: {
//         type: DataTypes.STRING,
//         allowNull: false,
//         unique: true,
//         validate: {
//           isEmail: true,
//         },
//       },
//       password: {
//         type: DataTypes.STRING,
//         allowNull: false,
//       },
//     });
  
//     return User;
//   };