const express = require('express');
const graphqlHTTP = require('express-graphql');
const { buildSchema } = require('graphql');

const Web3 = require('web3')
const contract = require('truffle-contract')
const MetaCoinArtifact = require('./build/contracts/Metacoin')
const MetCoinContract = contract(MetaCoinArtifact)
MetCoinContract.setProvider(new Web3.providers.HttpProvider('http://localhost:8545'))


const sourceFn = function({ method }) {
  return function() {
    return new Promise((resolve, reject) => {
      return MetCoinContract
              .deployed()
              .then(instance => {
                console.log('Inside sourceFN ------------------------ 1')
                console.log(`${method}`)
                // console.log(`${addr}`)
                return instance[method].call()
              })
              .then(data => {
                console.log('Inside sourceFN ------------------------ 2')
                // console.log(`returning ${data.toNumber()} `)
                // return resolve({balance: data.toNumber() })
                return resolve({
                  string: data[0],
                  bytes32: data[1],
                  value: {
                    string: data[2].toString(),
                    int: data[2].toNumber()
                  }
                })
              })
              .catch(e => {
                console.log('Inside sourceFN error ------------------------ ')
                return reject(e)
              })
    })
  } // end of input closure
}// end of method closure

const abiToGraphQlType = (input) => {
  switch (input) {
    case 'address':
      return 'String'
    default:
      return new Error(`Unknown mapping from abi type - ${input} - to graphQL type`)
  }
}

const abiOutputToGraphQLType = (input) => {
  const isInt = input.includes('int')
  if (isInt) {
    return 'Balance'
  }

  if (input === 'bool') {
    return 'Bool'
  }
  return new Error(`Unkown abi output tpe: ${input}`)
}

const getOutputType = (input) => {
  const { type } = input[0]
  return abiOutputToGraphQLType(type)
}


// console.log(MetaCoinArtifact.abi)
// console.log(JSON.stringify(MetaCoinArtifact.abi, null, 2))
// let queryOutput = MetaCoinArtifact.abi
//               // .filter(item => item.name === 'getBalance')
//               .filter(item => item.name !== 'sendCoin')
//               .filter(item => item.name !== 'Transfer')
//               .filter(item => item.type !== 'constructor')
//               .reduce((total, current, index) => {
//                 // console.log(current)
//                 const fnName = current.name
//                 const { name, type } = current.inputs[0]
//                 console.log('--------')
//                 // console.log(current.outputs)
//                 console.log(getOutputType(current.outputs))
//                 console.log('--------')
//                 const graphQlType = abiToGraphQlType(type)
//                 const outGraphQLType = getOutputType(current.outputs)
//                 let template = `${fnName}(${name}: ${graphQlType}): ${outGraphQLType}`
//                 return (index === 0) ? total + template : total + '\n    ' + template
//               }, '')
//
//
// const createdResolvers = MetaCoinArtifact.abi
//               // .filter(item => item.name === 'getBalance')
//               .filter(item => item.name !== 'sendCoin')
//               .filter(item => item.name !== 'Transfer')
//               .filter(item => item.type !== 'constructor')
//               .reduce((total, current) => {
//                 const { name } = current
//                 total[name] = sourceFn({ method: name })
//                 return total
//               }, {})
//               // .map(item => {
//               //   const { name } = item
//               //   return sourceFn({ method: name })
//               // })

// console.log(createdResolvers)
// output = "type Query {" + output + "\n}"

// console.log(output)
// console.log(JSON.stringify(queryOutput, null, 2))
// console.log('==============')
// const ABISCHEMA = `
//   type Balance {
//     string: String
//     int: Int
//   }
//   type Query {
//     ${queryOutput}
//   }
// `

const createQLType = require('./lib/createQLType')
const createFnQueryLines = require('./lib/createFnQueryLines')
// console.log(createQLType)
// const temporary = createQLType

const temporary1 = `
${createQLType}
${createFnQueryLines}
`

console.log(temporary1)

const temporary = `
  type Value {
    string: String
    int: Int
  }

  type otherOutput {
    string: String
    bytes32: String
    value: Value
  }

  type returns2Output {
    value: Value
    boolean: Boolean
  }

  type getBalanceOutput {
    value: Value
  }

  type Query {
    getBalance(addr: String): getBalanceOutput
    getBalanceInEth(addr: String): Value
    returns2(addr: String num: Int): returns2Output
    other: otherOutput
  }
`


// console.log(ABISCHEMA)
// Construct a schema, using GraphQL schema language
// var schema = buildSchema(`
//   type Balance {
//     string: String
//     int: Int
//   }
//   type Query {
//     hello: String
//     getBalance(addr: String): Balance
//   }
// `);
// var schema = buildSchema(ABISCHEMA);
var schema = buildSchema(temporary1);

const other = require('./lib/methods/other')
const returns2 = require('./lib/methods/returns2')
const getBalance = require('./lib/methods/getBalance')
const getBalanceInEth = require('./lib/methods/getBalanceInEth')

// The root provides a resolver function for each API endpoint
var root = {
  hello: () => {
    return 'Hello world!';
  },
  getBalance: (args) => {
    return getBalance(args)
  },
  getBalanceInEth: (args) => {
    return getBalanceInEth(args)
  },
  returns2: (args) => {
    return returns2(args)
  },
  other: () => {
    return other()
  }
};

// const root = createdResolvers

var app = express();
app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true,
}));
app.listen(4000);
console.log('Running a GraphQL API server at localhost:4000/graphql');
