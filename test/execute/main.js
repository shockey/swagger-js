import expect, {createSpy, spyOn} from 'expect'
import xmock from 'xmock'
import {execute, buildRequest, baseUrl, self as stubs} from '../../src/execute'
import {normalizeSwagger} from '../../src/helpers'

// Supported shape...  { spec, operationId, parameters, securities, fetch }
// One can use operationId or pathItem + method

describe('execute', () => {
  afterEach(function () {
    expect.restoreSpies()
  })

  describe('buildRequest', function () {
    it('should build a request for the given operationId', function () {
      // Given
      const spec = {
        host: 'swagger.io',
        schemes: ['http'],
        basePath: '/v1',
        paths: {
          '/one': {
            get: {
              operationId: 'getMe'
            }
          }
        }
      }

      // when
      const req = buildRequest({spec, operationId: 'getMe'})

      expect(req).toEqual({
        method: 'GET',
        url: 'http://swagger.io/v1/one',
        credentials: 'same-origin',
        headers: {},
      })
    })

    it('should include host + port', function () {
      // Given
      const spec = {
        host: 'foo.com:8081',
        basePath: '/v1',
        paths: {
          '/': {
            get: {
              operationId: 'foo'
            }
          }
        }
      }

      // When
      const req = buildRequest({spec, operationId: 'foo'})

      // Then
      expect(req).toEqual({
        url: 'http://foo.com:8081/v1/',
        method: 'GET',
        credentials: 'same-origin',
        headers: { }
      })
    })

    it('should include operation specifics', function () {
      // Given
      const spec = {
        host: 'swagger.io',
        basePath: '/v1',
        paths: {
          '/one': {
            get: {
              operationId: 'getMe',
            }
          }
        }
      }

      // When
      const req = buildRequest({spec, operationId: 'getMe'})

      // Then
      expect(req).toEqual({
        url: 'http://swagger.io/v1/one',
        method: 'GET',
        credentials: 'same-origin',
        headers: { }
      })
    })

    it('should execute a simple get request', () => {
      // Given
      const spec = {
        host: 'swagger.io',
        schemes: ['https'],
        paths: {
          '/one': {
            get: {
              operationId: 'getMe'
            }
          }
        }
      }

      const spy = createSpy().andReturn(Promise.resolve())

      execute({
        fetch: spy,
        spec,
        operationId: 'getMe'
      })

      expect(spy.calls.length).toEqual(1)
      expect(spy.calls[0].arguments[0]).toEqual({
        method: 'GET',
        url: 'https://swagger.io/one',
        credentials: 'same-origin',
        headers: { }
      })
    })

    it('should execute a simple get request with user-defined fetch', () => {
      // Given
      const spec = {
        host: 'swagger.io',
        schemes: ['https'],
        paths: {
          '/one': {
            get: {
              operationId: 'getMe'
            }
          }
        }
      }

      const spy = createSpy().andReturn(Promise.resolve())

      execute({
        userFetch: spy,
        spec,
        operationId: 'getMe'
      })
      expect(spy.calls.length).toEqual(1)
      expect(spy.calls[0].arguments[1]).toEqual({
        method: 'GET',
        url: 'https://swagger.io/one',
        credentials: 'same-origin',
        headers: { },
        userFetch: spy
      })
    })

    it('should include values for query parameters', function () {
      // Given
      const spec = {
        host: 'swagger.io',
        basePath: '/v1',
        paths: {
          '/one': {
            get: {
              operationId: 'getMe',
              parameters: [{name: 'petId', in: 'query'}]
            }
          }
        }
      }

      // When
      const req = buildRequest({spec, operationId: 'getMe', parameters: {petId: 123}})

      // Then
      expect(req).toEqual({
        url: 'http://swagger.io/v1/one?petId=123',
        method: 'GET',
        credentials: 'same-origin',
        headers: { }
      })
    })

    it('should include values that have brackets', function () {
      // Given
      const spec = {
        host: 'swagger.io',
        basePath: '/v1',
        paths: {
          '/one': {
            get: {
              operationId: 'getMe',
              parameters: [{
                name: 'fields',
                in: 'query',
                type: 'string'
              }]
            }
          }
        }
      }

      // When
      const req = buildRequest({spec, operationId: 'getMe', parameters: {fields: '[articles]=title'}})

      // Then
      expect(req).toEqual({
        url: 'http://swagger.io/v1/one?fields=%5Barticles%5D%3Dtitle',
        method: 'GET',
        credentials: 'same-origin',
        headers: { }
      })
    })

    it('should include values and defaults that are falsy', function () {
      // Given
      const spec = {
        host: 'swagger.io',
        basePath: '/v1',
        paths: {
          '/one': {
            get: {
              operationId: 'getMe',
              parameters: [
                {
                  name: 'zero',
                  in: 'query',
                  type: 'integer'
                },
                {
                  name: 'false',
                  in: 'query',
                  type: 'boolean'
                },
                {
                  name: 'zeroDefault',
                  in: 'query',
                  type: 'integer',
                  default: 0
                },
                {
                  name: 'falseDefault',
                  in: 'query',
                  type: 'boolean',
                  default: false
                },
              ]
            }
          }
        }
      }

      // When
      const req = buildRequest({
        spec,
        operationId: 'getMe',
        parameters: {
          false: false,
          zero: 0
        }
      })

      // Then
      expect(req).toEqual({
        url: 'http://swagger.io/v1/one?zero=0&false=false&zeroDefault=0&falseDefault=false',
        method: 'GET',
        credentials: 'same-origin',
        headers: { }
      })
    })

    it('should include values for boolean query parameters', function () {
      // Given
      const spec = {
        host: 'swagger.io',
        basePath: '/v1',
        paths: {
          '/one': {
            get: {
              operationId: 'getMe',
              parameters: [{
                name: 'petId',
                in: 'query',
                type: 'boolean'
              }]
            }
          }
        }
      }

      // When
      const req = buildRequest({spec, operationId: 'getMe', parameters: {petId: true}})

      // Then
      expect(req).toEqual({
        url: 'http://swagger.io/v1/one?petId=true',
        method: 'GET',
        credentials: 'same-origin',
        headers: { }
      })
    })

    it('should include the default value', function () {
      const spec = {
        host: 'swagger.io',
        basePath: '/v1',
        paths: {
          '/one': {
            get: {
              operationId: 'getMe',
              parameters: [{
                name: 'petId',
                in: 'query',
                type: 'integer',
                default: 3
              }]
            }
          }
        }
      }

      const req = buildRequest({spec, operationId: 'getMe', parameters: {}})

      expect(req).toEqual({
        url: 'http://swagger.io/v1/one?petId=3',
        method: 'GET',
        credentials: 'same-origin',
        headers: { }
      })
    })

    it('should throw error if required parameter value is not provided', function () {
      // Given
      const spec = {
        host: 'swagger.io',
        basePath: '/v1',
        paths: {
          '/one': {
            get: {
              operationId: 'getMe',
              parameters: [{
                name: 'petId',
                in: 'query',
                required: true,
                type: 'string'
              }]
            }
          }
        }
      }

      expect(() => buildRequest({spec, operationId: 'getMe'})).toThrow('Required parameter petId is not provided')
    })

    it('should throw error if operation was not found', function () {
      // Given
      const spec = {
        host: 'swagger.io',
        basePath: '/v1',
        paths: {
          '/one': {
            get: {
              operationId: 'getMe'
            }
          }
        }
      }

      expect(() => buildRequest({spec, operationId: 'nonExistingOperationId'})).toThrow('Operation nonExistingOperationId not found')
    })

    describe('formData', function () {
      it('should add an empty query param if the value is empty and allowEmptyValue: true', function () {
        // Given
        const spec = {
          host: 'swagger.io',
          basePath: '/v1',
          paths: {
            '/one': {
              delete: {
                operationId: 'deleteMe',
                parameters: [{
                  name: 'petId',
                  in: 'formData',
                  allowEmptyValue: true
                }]
              }
            }
          }
        }

        // When
        const req = buildRequest({spec, operationId: 'deleteMe', parameters: {}})

        // Then
        expect(req.body).toEqual('petId=')
      })

      it('should support collectionFormat', function () {
        const spec = {
          host: 'swagger.io',
          basePath: '/v1',
          paths: {
            '/one': {
              get: {
                operationId: 'getMe',
                parameters: [{
                  name: 'petId',
                  in: 'formData',
                  collectionFormat: 'csv',
                  type: 'array',
                  items: {
                    type: 'integer'
                  }
                }]
              }
            }
          }
        }

        // When
        const req = buildRequest({spec, operationId: 'getMe', parameters: {petId: [1, 2, 3]}})

        // Then
        expect(req.body).toEqual('petId=1,2,3')
      })
    })

    it('should add an empty query param if the value is empty and allowEmptyValue: true', function () {
      // Given
      const spec = {
        host: 'swagger.io',
        basePath: '/v1',
        consumes: ['application/json'],
        paths: {
          '/pets/findByStatus': {
            get: {
              operationId: 'getMe',
              parameters: [{
                in: 'query',
                name: 'status',
                type: 'string',
                required: false,
                allowEmptyValue: true
              }]
            }
          }
        }
      }

      // When
      const req = buildRequest({spec, operationId: 'getMe', parameters: {}})

      // Then
      expect(req).toEqual({
        url: 'http://swagger.io/v1/pets/findByStatus?status=',
        method: 'GET',
        credentials: 'same-origin',
        headers: { }
      })
    })

    it('should correctly process boolean parameters', function () {
      // Given
      const spec = {
        host: 'swagger.io',
        basePath: '/v1',
        consumes: ['application/json'],
        paths: {
          '/pets/findByStatus': {
            get: {
              operationId: 'getMe',
              parameters: [{
                in: 'query',
                name: 'status',
                type: 'boolean',
                required: false
              }]
            }
          }
        }
      }

      // When
      const req = buildRequest({spec, operationId: 'getMe', parameters: {status: false}})

      // Then
      expect(req).toEqual({
        url: 'http://swagger.io/v1/pets/findByStatus?status=false',
        method: 'GET',
        credentials: 'same-origin',
        headers: { }
      })
    })

    it('should throw error if there is no parameter value', function () {
      // Given
      const spec = {
        host: 'swagger.io',
        basePath: '/v1',
        consumes: ['application/json'],
        paths: {
          '/pets/findByStatus': {
            get: {
              operationId: 'getMe',
              parameters: [{
                in: 'query',
                name: 'status',
                type: 'string',
                required: true
              }]
            }
          }
        }
      }

      // Then
      expect(() => buildRequest({spec, operationId: 'getMe', parameters: {}})).toThrow()
    })

    it('should handle responseContentType', function () {
      // Given
      const spec = {
        host: 'swagger.io',
        paths: {'/one': {get: {operationId: 'getMe'}}}
      }

      // When
      const req = buildRequest({spec, operationId: 'getMe', responseContentType: 'application/josh'})

      // Then
      expect(req).toEqual({
        url: 'http://swagger.io/one',
        credentials: 'same-origin',
        headers: {
          accept: 'application/josh',
        },
        method: 'GET'
      })
    })

    it('should set the correct scheme', function () {
      const spec = {
        host: 'swagger.io',
        basePath: '/v1',
        paths: {
          '/one': {
            get: {
              operationId: 'loginUser',
              parameters: [{
                in: 'query',
                name: 'username',
                type: 'string'
              },
              {
                in: 'query',
                name: 'password',
                type: 'string'
              }]
            }
          }
        }
      }

      const req = buildRequest({spec, operationId: 'loginUser', parameters: {username: 'fred', password: 'meyer'}})

      expect(req).toEqual({
        url: 'http://swagger.io/v1/one?username=fred&password=meyer',
        method: 'GET',
        credentials: 'same-origin',
        headers: { }
      })
    })

    it('should add Content-Type if a body param definition is present but there is no payload', function () {
      // Given
      const spec = {
        host: 'swagger.io',
        paths: {
          '/one': {
            get: {
              operationId: 'getMe',
              parameters: [
                {
                  name: 'body',
                  in: 'body',
                  schema: {
                    type: 'string'
                  }
                }
              ]
            }
          }
        }
      }

      // When
      const req = buildRequest({
        spec,
        operationId: 'getMe',
        requestContentType: 'application/josh'
      })

      // Then
      expect(req).toEqual({
        url: 'http://swagger.io/one',
        body: undefined,
        headers: {
          'Content-Type': 'application/josh'
        },
        credentials: 'same-origin',
        method: 'GET'
      })
    })

    it('should not add Content-Type if no form-data or body param definition is present', function () {
      // Given
      const spec = {
        host: 'swagger.io',
        paths: {'/one': {get: {operationId: 'getMe'}}}
      }

      // When
      const req = buildRequest({spec, operationId: 'getMe', requestContentType: 'application/josh'})

      // Then
      expect(req).toEqual({
        url: 'http://swagger.io/one',
        headers: {},
        credentials: 'same-origin',
        method: 'GET'
      })
    })

    it('should add Content-Type multipart/form-data when param type is file and no other sources of consumes', function () {
      // Given
      const FormData = require('isomorphic-form-data')
      const spec = {
        host: 'swagger.io',
        paths: {
          '/one': {
            post: {
              operationId: 'postMe',
              parameters: [{name: 'foo', type: 'file', in: 'formData'}]
            }
          }
        }
      }

      // When
      const req = buildRequest({
        spec,
        operationId: 'postMe',
        parameters: {file: 'test'}})

      // Then
      expect(req.headers).toEqual({
        'Content-Type': 'multipart/form-data'
      })

      // Would like to do a more thourough test ( ie: ensure the value `foo` exists..
      // but I don't feel like attacking the interals of the node pollyfill
      // for FormData, as it seems to be missing `.get()`)
      expect(req.url).toEqual('http://swagger.io/one')
      expect(req.body).toBeA(FormData)
    })

    it('should add Content-Type application/x-www-form-urlencoded when in: formData ', function () {
      // Given
      const spec = {
        host: 'swagger.io',
        paths: {
          '/one': {
            post: {
              operationId: 'postMe',
              parameters: [{name: 'file', in: 'formData'}]
            }
          }
        }
      }

      // When
      const req = buildRequest({
        spec,
        operationId: 'postMe',
        parameters: {file: 'test'}})

      // Then
      expect(req).toEqual({
        body: 'file=test',
        method: 'POST',
        url: 'http://swagger.io/one',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        credentials: 'same-origin'
      })
    })

    it('should add Content-Type from spec when no consumes in operation and no requestContentType passed', function () {
      // Given
      const spec = {
        host: 'swagger.io',
        consumes: ['test'],
        paths: {
          '/one': {
            post: {
              operationId: 'postMe',
              parameters: [{name: 'file', in: 'formData'}]
            }
          }
        }
      }

      // When
      const req = buildRequest({
        spec,
        operationId: 'postMe',
        parameters: {file: 'test'}})

      // Then
      expect(req).toEqual({
        body: 'file=test',
        method: 'POST',
        url: 'http://swagger.io/one',
        headers: {
          'Content-Type': 'test'
        },
        credentials: 'same-origin'
      })
    })

    it('should add Content-Type from operation when no requestContentType passed', function () {
      // Given
      const spec = {
        host: 'swagger.io',
        consumes: ['no'],
        paths: {
          '/one': {
            post: {
              operationId: 'postMe',
              consumes: ['test'],
              parameters: [{name: 'file', in: 'formData'}]
            }
          }
        }
      }

      // When
      const req = buildRequest({
        spec,
        operationId: 'postMe',
        parameters: {file: 'test'}})

      // Then
      expect(req).toEqual({
        body: 'file=test',
        method: 'POST',
        url: 'http://swagger.io/one',
        headers: {
          'Content-Type': 'test'
        },
        credentials: 'same-origin'
      })
    })

    it('should build a request for all given fields', function () {
      // Given
      const spec = {
        host: 'swagger.io',
        basePath: '/api',
        schemes: ['whoop'],
        paths: {
          '/one/{two}': {
            put: {
              operationId: 'getMe',
              produces: ['mime/silent-french-type'],
              parameters: [
                {
                  in: 'query',
                  name: 'question',
                  type: 'string',
                  example: 'hello'
                },
                {
                  in: 'header',
                  name: 'head',
                  type: 'string',
                  example: 'hi'
                },
                {
                  in: 'path',
                  name: 'two',
                  type: 'number',
                  example: '2'
                },
                {
                  in: 'body',
                  name: 'body',
                  schema: {
                    type: 'object',
                    properties: {
                      one: {
                        type: 'string'
                      }
                    },
                    example: '2'
                  }
                },
              ],
            }
          }
        }
      }

      // When
      const req = buildRequest({spec,
        operationId: 'getMe',
        parameters: {
          head: 'justTheHead',
          two: '2',
          body: {json: 'rulez'},
          question: 'answer'
        }})

      // Then
      expect(req).toEqual({
        url: 'whoop://swagger.io/api/one/2?question=answer',
        method: 'PUT',
        credentials: 'same-origin',
        headers: {
          head: 'justTheHead',
        },
        body: {
          json: 'rulez'
        }
      })
    })

    it('should NOT stringify the body, if provided with a javascript object', function () {
      // execute alone should do that, allowing us to modify the object in a clean way)

      // Given
      const spec = {
        host: 'swagger.io',
        paths: {'/me': {post: {parameters: [{name: 'body', in: 'body'}], operationId: 'makeMe'}}}
      }

      const req = buildRequest({
        spec,
        operationId: 'makeMe',
        parameters: {
          body: {
            one: 1,
          }
        }})

      expect(req.body).toEqual({
        one: 1
      })
    })

    describe('attachContentTypeForEmptyPayload', () => {
      it('should attach a Content-Type to a Swagger 2 operation with a body parameter defined but no body provided', () => {
        const spec = {
          swagger: '2.0',
          host: 'swagger.io',
          consumes: ['application/json'],
          paths: {
            '/one': {
              post: {
                operationId: 'myOp',
                parameters: [
                  {
                    name: 'body',
                    in: 'body'
                  }
                ]
              }
            }
          }
        }

        const req = buildRequest({
          spec,
          operationId: 'myOp',
          attachContentTypeForEmptyPayload: true
        })

        expect(req).toEqual({
          url: 'http://swagger.io/one',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'same-origin',
          method: 'POST',
          body: undefined
        })
      })
      it('should attach a Content-Type to a Swagger 2 operation with a formData parameter defined but no body provided', () => {
        const spec = {
          swagger: '2.0',
          host: 'swagger.io',
          paths: {
            '/one': {
              post: {
                operationId: 'myOp',
                parameters: [
                  {
                    name: 'data',
                    in: 'formData',
                    type: 'string'
                  }
                ]
              }
            }
          }
        }

        const req = buildRequest({
          spec,
          operationId: 'myOp',
          attachContentTypeForEmptyPayload: true
        })

        expect(req).toEqual({
          url: 'http://swagger.io/one',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          credentials: 'same-origin',
          method: 'POST'
        })
      })
      it('should not attach a Content-Type to a Swagger 2 operation with no body or formData parameter definition present', () => {
        const spec = {
          swagger: '2.0',
          host: 'swagger.io',
          paths: {
            '/one': {
              post: {
                operationId: 'myOp'
              }
            }
          }
        }

        const req = buildRequest({
          spec,
          operationId: 'myOp',
          attachContentTypeForEmptyPayload: true
        })

        expect(req).toEqual({
          url: 'http://swagger.io/one',
          headers: {},
          credentials: 'same-origin',
          method: 'POST'
        })
      })
      it('should not attach a Content-Type to a Swagger 2 operation with a body parameter defined but no body provided if the option is not enabled', () => {
        const spec = {
          swagger: '2.0',
          host: 'swagger.io',
          consumes: ['application/json'],
          paths: {
            '/one': {
              post: {
                operationId: 'myOp',
                parameters: [
                  {
                    name: 'body',
                    in: 'body'
                  }
                ]
              }
            }
          }
        }

        const req = buildRequest({
          spec,
          operationId: 'myOp',
        })

        expect(req).toEqual({
          url: 'http://swagger.io/one',
          headers: {},
          credentials: 'same-origin',
          method: 'POST',
          body: undefined
        })
      })
      it('should not attach a Content-Type to a Swagger 2 operation with a formData parameter defined but no body provided if the option is not enabled', () => {
        const spec = {
          swagger: '2.0',
          host: 'swagger.io',
          paths: {
            '/one': {
              post: {
                operationId: 'myOp',
                parameters: [
                  {
                    name: 'data',
                    in: 'formData',
                    type: 'string'
                  }
                ]
              }
            }
          }
        }

        const req = buildRequest({
          spec,
          operationId: 'myOp',
        })

        expect(req).toEqual({
          url: 'http://swagger.io/one',
          headers: {},
          credentials: 'same-origin',
          method: 'POST'
        })
      })
    })
  })


  // Note: this is to handle requestContentType and responseContentType
  // although more might end up using it.
  it('should pass extras props to buildRequest', () => {
    // Given
    const spec = {
      host: 'swagger.io',
      paths: {'/one': {get: {operationId: 'getMe'}}}
    }

    const buildRequestSpy = spyOn(stubs, 'buildRequest').andReturn({})

    execute({
      fetch: createSpy().andReturn({then() { }}),
      spec,
      operationId: 'getMe',
      josh: 1
    })

    expect(buildRequestSpy.calls.length).toEqual(1)
    expect(buildRequestSpy.calls[0].arguments[0]).toInclude({
      josh: 1
    })
  })

  it('should stringify body, if provided with javascript object', function () {
    // Given
    const spec = {
      host: 'swagger.io',
      paths: {'/me': {post: {parameters: [{name: 'body', in: 'body'}], operationId: 'makeMe'}}}
    }

    const fetchSpy = createSpy().andReturn({then() { }})

    execute({
      fetch: fetchSpy,
      spec,
      operationId: 'makeMe',
      parameters: {
        body: {
          one: 1,
          two: {
            three: 3
          }
        }
      }
    })

    expect(fetchSpy.calls.length).toEqual(1)
    expect(fetchSpy.calls[0].arguments[0].body).toEqual('{"one":1,"two":{"three":3}}')
  })

  it('should NOT stringify body, if its a non-object', function () {
    // Given
    const spec = {
      host: 'swagger.io',
      paths: {'/me': {post: {parameters: [{name: 'body', in: 'body'}], operationId: 'makeMe'}}}
    }

    const fetchSpy = createSpy().andReturn({then() { }})

    execute({
      fetch: fetchSpy,
      spec,
      operationId: 'makeMe',
      parameters: {
        body: 'hello'
      }
    })

    expect(fetchSpy.calls.length).toEqual(1)
    expect(fetchSpy.calls[0].arguments[0].body).toEqual('hello')
  })

  it('should NOT stringify body, if its an instance of FormData', function () {
    // Given
    const FormData = require('isomorphic-form-data')
    const spec = {
      host: 'swagger.io',
      paths: {'/me': {post: {parameters: [{name: 'one', in: 'formData'}], operationId: 'makeMe'}}}
    }

    const fetchSpy = createSpy().andReturn({then() { }})

    execute({
      fetch: fetchSpy,
      spec,
      operationId: 'makeMe',
      requestContentType: 'multipart/form-data',
      parameters: {
        one: {hello: true}
      }
    })

    const req = fetchSpy.calls[0].arguments[0]
    expect(fetchSpy.calls.length).toEqual(1)
    expect(fetchSpy.calls[0].arguments[0].body).toBeA(FormData)
  })

  describe('parameterBuilders', function () {
    describe('query', function () {
      it('should include the values for array of query parameters', function () {
        // Given
        const spec = {
          host: 'swagger.io',
          basePath: '/v1',
          paths: {
            '/one': {
              get: {
                operationId: 'getMe',
                parameters: [{
                  name: 'petId',
                  in: 'query',
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                }]
              }
            }
          }
        }

        // When
        const req = buildRequest({spec, operationId: 'getMe', parameters: {petId: ['a,b']}})

        // Then
        expect(req).toEqual({
          url: 'http://swagger.io/v1/one?petId=a%2Cb',
          method: 'GET',
          credentials: 'same-origin',
          headers: { }
        })
      })

      it('should allow multiple collectionFormats', function () {
        // Given
        const spec = {
          host: 'swagger.io',
          basePath: '/v1',
          paths: {
            '/one': {
              get: {
                operationId: 'getMe',
                parameters: [
                  {
                    name: 'ids',
                    in: 'query',
                    collectionFormat: 'csv',
                    type: 'array',
                    items: {
                      type: 'integer'
                    },
                  },
                  {
                    name: 'the names',
                    in: 'query',
                    collectionFormat: 'pipes',
                    type: 'array',
                    items: {
                      type: 'string'
                    },
                  }
                ]
              }
            }
          }
        }

        // When
        const req = buildRequest({spec, operationId: 'getMe', parameters: {ids: [1, 2, 3], 'the names': ['a,b', 'mary']}})

        // Then
        expect(req).toEqual({
          url: 'http://swagger.io/v1/one?ids=1,2,3&the%20names=a%2Cb|mary',
          method: 'GET',
          credentials: 'same-origin',
          headers: { }
        })
      })

      it('should include values for array of query parameters \'csv\' collectionFormat', function () {
        // Given
        const spec = {
          host: 'swagger.io',
          basePath: '/v1',
          paths: {
            '/one': {
              get: {
                operationId: 'getMe',
                parameters: [{
                  name: 'petId',
                  in: 'query',
                  collectionFormat: 'csv',
                  type: 'array',
                  items: {
                    type: 'integer'
                  }
                }]
              }
            }
          }
        }

        // When
        const req = buildRequest({spec, operationId: 'getMe', parameters: {petId: [1, 2, 3]}})

        // Then
        expect(req).toEqual({
          url: 'http://swagger.io/v1/one?petId=1,2,3',
          method: 'GET',
          credentials: 'same-origin',
          headers: { }
        })
      })

      it('should include values for array of query parameters \'ssv\' collectionFormat', function () {
        // Given
        const spec = {
          host: 'swagger.io',
          basePath: '/v1',
          paths: {
            '/one': {
              get: {
                operationId: 'getMe',
                parameters: [{
                  name: 'petId',
                  in: 'query',
                  collectionFormat: 'ssv',
                  type: 'array',
                  items: {
                    type: 'integer'
                  }
                }]
              }
            }
          }
        }

        // When
        const req = buildRequest({spec, operationId: 'getMe', parameters: {petId: [1, 2, 3]}})

        // Then
        expect(req).toEqual({
          url: 'http://swagger.io/v1/one?petId=1%202%203',
          method: 'GET',
          credentials: 'same-origin',
          headers: { }
        })
      })

      it('should include values for array of query parameters \'multi\' collectionFormat', function () {
        // Given
        const spec = {
          host: 'swagger.io',
          basePath: '/v1',
          paths: {
            '/one': {
              get: {
                operationId: 'getMe',
                parameters: [{
                  name: 'petId',
                  in: 'query',
                  collectionFormat: 'multi',
                  type: 'array',
                  items: {
                    type: 'integer'
                  }
                }]
              }
            }
          }
        }

        // When
        const req = buildRequest({spec, operationId: 'getMe', parameters: {petId: [1, 2, 3]}})

        // Then
        expect(req).toEqual({
          url: 'http://swagger.io/v1/one?petId=1&petId=2&petId=3',
          method: 'GET',
          credentials: 'same-origin',
          headers: { }
        })
      })

      it('should include values for array of query parameters \'tsv\' collectionFormat', function () {
        // Given
        const spec = {
          host: 'swagger.io',
          basePath: '/v1',
          paths: {
            '/one': {
              get: {
                operationId: 'getMe',
                parameters: [{
                  name: 'petId',
                  in: 'query',
                  collectionFormat: 'tsv',
                  type: 'array',
                  items: {
                    type: 'integer'
                  }
                }]
              }
            }
          }
        }

        // When
        const req = buildRequest({spec, operationId: 'getMe', parameters: {petId: [1, 2, 3]}})

        // Then
        expect(req).toEqual({
          url: 'http://swagger.io/v1/one?petId=1%092%093',
          method: 'GET',
          credentials: 'same-origin',
          headers: { }
        })
      })

      it('should include values for array of query parameters \'pipes\' collectionFormat', function () {
        // Given
        const spec = {
          host: 'swagger.io',
          basePath: '/v1',
          paths: {
            '/one': {
              get: {
                operationId: 'getMe',
                parameters: [{
                  name: 'name',
                  in: 'query',
                  collectionFormat: 'pipes',
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                }]
              }
            }
          }
        }

        // When
        const req = buildRequest({spec, operationId: 'getMe', parameters: {name: ['john', 'smith']}})

        // Then
        expect(req).toEqual({
          url: 'http://swagger.io/v1/one?name=john|smith',
          method: 'GET',
          credentials: 'same-origin',
          headers: { }
        })
      })

      it('should fall back to `name-in` format when a parameter cannot be found', function () {
        // Given
        const spec = {
          host: 'swagger.io',
          basePath: '/v1',
          paths: {
            '/one': {
              get: {
                operationId: 'getMe',
                parameters: [{
                  name: 'name',
                  in: 'query',
                  type: 'string'
                }]
              }
            }
          }
        }

        // When
        const req = buildRequest({spec, operationId: 'getMe', parameters: {'query.name': 'john'}})

        // Then
        expect(req).toEqual({
          url: 'http://swagger.io/v1/one?name=john',
          method: 'GET',
          credentials: 'same-origin',
          headers: { }
        })
      })

      it('should set all parameter options when given an ambiguous parameter value', function () {
        // Given
        const spec = {
          host: 'swagger.io',
          basePath: '/v1',
          paths: {
            '/one': {
              get: {
                operationId: 'getMe',
                parameters: [{
                  name: 'name',
                  in: 'query',
                  type: 'string'
                }, {
                  name: 'name',
                  in: 'formData',
                  type: 'string'
                }]
              }
            }
          }
        }

        // When
        const req = buildRequest({spec, operationId: 'getMe', parameters: {name: 'john'}})

        // Then
        expect(req).toEqual({
          url: 'http://swagger.io/v1/one?name=john',
          method: 'GET',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: 'name=john'
        })
      })
    })

    describe('body', function () {
      describe('POST', function () {
        const spec = {
          host: 'swagger.io',
          basePath: '/v1',
          paths: {
            '/one': {
              post: {
                operationId: 'postMe',
                parameters: [{
                  name: 'petId',
                  in: 'body',
                  schema: {
                    type: 'integer'
                  }
                }]
              }
            }
          }
        }

        it('should serialize the body', function () {
          const spec2 = {
            host: 'swagger.io',
            paths: {
              '/v1/blob/image.png': {
                post: {
                  operationId: 'getBlob',
                  parameters: [
                    {
                      name: 'someQuery',
                      in: 'query',
                      type: 'string',
                    },
                    {
                      name: 'bodyParam',
                      in: 'body',
                      required: true,
                      schema: {
                        type: 'object',
                        properties: {
                          id: {type: 'integer'},
                          name: {type: 'string'}
                        }
                      }
                    }
                  ]
                }
              }
            }
          }

          const req = buildRequest({
            spec: spec2,
            operationId: 'getBlob',
            parameters: {
              bodyParam: {
                name: 'johny',
                id: '123'
              },
              someQuery: 'foo',
            }})


          expect(req).toEqual({
            url: 'http://swagger.io/v1/blob/image.png?someQuery=foo',
            method: 'POST',
            credentials: 'same-origin',
            body: {
              name: 'johny',
              id: '123',
            },
            headers: { }
          })
        })

        it('should not add values of body parameters to the URL', function () {
          const req = buildRequest({spec, operationId: 'postMe', parameters: {petId: 123}})


          expect(req).toEqual({
            url: 'http://swagger.io/v1/one',
            method: 'POST',
            body: 123,
            credentials: 'same-origin',
            headers: { }
          })
        })

        it('should generate a request with an empty body parameter', function () {
          const req = buildRequest({spec, operationId: 'postMe', parameters: {}})


          expect(req).toEqual({
            url: 'http://swagger.io/v1/one',
            method: 'POST',
            body: undefined,
            credentials: 'same-origin',
            headers: { }
          })
        })
      })

      describe('DELETE', function () {
        const spec = {
          host: 'swagger.io',
          basePath: '/v1',
          paths: {
            '/one': {
              delete: {
                operationId: 'deleteMe',
                parameters: [{
                  name: 'petId',
                  in: 'body',
                }]
              }
            }
          }
        }

        it('should generate a request with an empty body parameter', function () {
          const req = buildRequest({spec, operationId: 'deleteMe', parameters: {}})

          expect(req).toEqual({
            url: 'http://swagger.io/v1/one',
            method: 'DELETE',
            body: undefined,
            credentials: 'same-origin',
            headers: { }
          })
        })

        it('should generate a request with body parameter', function () {
          const req = buildRequest({spec, operationId: 'deleteMe', parameters: {petId: 123}})

          expect(req).toEqual({
            url: 'http://swagger.io/v1/one',
            method: 'DELETE',
            body: 123,
            credentials: 'same-origin',
            headers: { }
          })
        })
      })
    })

    describe('headers', function () {
      it('should process a delete request with headers', function () {
        const spec = {
          host: 'swagger.io',
          basePath: '/v1',
          paths: {
            '/one': {
              delete: {
                operationId: 'deleteMe',
                parameters: [{
                  in: 'header',
                  name: 'api_key',
                  type: 'integer'
                }]
              }
            }
          }
        }

        const req = buildRequest({spec, operationId: 'deleteMe', parameters: {api_key: 123}})

        expect(req).toEqual({
          url: 'http://swagger.io/v1/one',
          method: 'DELETE',
          credentials: 'same-origin',
          headers: {
            api_key: 123,
          }
        })
      })

      it('should process a delete request without headers of value undefined', function () {
        const spec = {
          host: 'swagger.io',
          basePath: '/v1',
          paths: {
            '/one': {
              delete: {
                operationId: 'deleteMe',
                parameters: [{
                  in: 'header',
                  name: 'api_key',
                  type: 'integer'
                }]
              }
            }
          }
        }

        const req = buildRequest({spec, operationId: 'deleteMe', parameters: {api_key: undefined}})

        expect(req).toEqual({
          url: 'http://swagger.io/v1/one',
          method: 'DELETE',
          credentials: 'same-origin',
          headers: {}
        })
      })

      it('should process a delete request without headers wich are not provided', function () {
        const spec = {
          host: 'swagger.io',
          basePath: '/v1',
          paths: {
            '/one': {
              delete: {
                operationId: 'deleteMe',
                parameters: [{
                  in: 'header',
                  name: 'api_key',
                  type: 'integer'
                }]
              }
            }
          }
        }

        const req = buildRequest({spec, operationId: 'deleteMe', parameters: {}})

        expect(req).toEqual({
          url: 'http://swagger.io/v1/one',
          method: 'DELETE',
          credentials: 'same-origin',
          headers: {}
        })
      })

      it('should accept the format', function () {
        const spec = {
          host: 'swagger.io',
          basePath: '/v1',
          paths: {
            '/one': {
              get: {
                operationId: 'getMe',
                consumes: ['application/json'],
                parameters: [{
                  in: 'query',
                  name: 'petId',
                  type: 'string',
                  required: false
                }]
              }
            }
          }
        }

        const req = buildRequest({spec, operationId: 'getMe', responseContentType: 'application/json', parameters: {}})

        expect(req).toEqual({
          url: 'http://swagger.io/v1/one',
          method: 'GET',
          credentials: 'same-origin',
          headers: {
            accept: 'application/json',
          }
        })
      })
    })

    describe('path', function () {
      it('should replace path parameters with their values', function () {
        const spec = {
          host: 'swagger.io',
          basePath: '/v1',
          paths: {
            '/{id}': {
              get: {
                operationId: 'getMe',
                parameters: [{
                  in: 'path',
                  name: 'id',
                  type: 'number',
                  required: true
                }]
              }
            }
          }
        }

        const req = buildRequest({spec, operationId: 'getMe', parameters: {id: '123'}})

        expect(req).toEqual({
          url: 'http://swagger.io/v1/123',
          method: 'GET',
          credentials: 'same-origin',
          headers: {
          }
        })
      })

      it('should merge Path and Operation parameters', function () {
        const spec = {
          host: 'swagger.io',
          basePath: '/v1',
          paths: {
            '/pet/{id}': {
              get: {
                operationId: 'getPetsById',
                parameters: [
                  {
                    name: 'test',
                    in: 'query',
                    type: 'number'
                  }
                ],
              },
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  type: 'number',
                  required: true
                }
              ],
            }
          }
        }

        const req = buildRequest({spec, operationId: 'getPetsById', parameters: {id: 123, test: 567}})

        expect(req).toEqual({
          url: 'http://swagger.io/v1/pet/123?test=567',
          headers: {},
          credentials: 'same-origin',
          method: 'GET'
        })
      })

      it('should merge Path and Operation parameters when parameter is the first item in paths', function () {
        const spec = {
          host: 'swagger.io',
          basePath: '/v1',
          paths: {
            '/pet/{id}': {
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  type: 'number',
                  required: true
                }
              ],
              get: {
                operationId: 'getPetsById',
                parameters: [
                  {
                    name: 'test',
                    in: 'query',
                    type: 'number'
                  }
                ],
              }
            }
          }
        }

        const req = buildRequest({spec, operationId: 'getPetsById', parameters: {id: 123, test: 567}})

        expect(req).toEqual({
          url: 'http://swagger.io/v1/pet/123?test=567',
          headers: {},
          credentials: 'same-origin',
          method: 'GET'
        })
      })

      it('should handle duplicate parameter inheritance from normalized swagger specifications', function () {
        const spec = {
          spec: {
            host: 'swagger.io',
            basePath: '/v1',
            paths: {
              '/pet/{id}': {
                parameters: [
                  {
                    name: 'id',
                    in: 'path',
                    type: 'number',
                    required: true
                  }
                ],
                get: {
                  operationId: 'getPetsById',
                  parameters: [
                    {
                      name: 'test',
                      in: 'query',
                      type: 'number'
                    }
                  ],
                }
              }
            }
          }
        }

        const resultSpec = normalizeSwagger(spec)
        const warnSpy = expect.spyOn(console, 'warn')
        const req = buildRequest({spec: resultSpec.spec, operationId: 'getPetsById', parameters: {id: 123, test: 567}})
        expect(req).toEqual({
          url: 'http://swagger.io/v1/pet/123?test=567',
          headers: {},
          credentials: 'same-origin',
          method: 'GET'
        })
        expect(warnSpy.calls.length).toEqual(0)
      })

      it('should warn for ambiguous parameters in normalized swagger specifications', function () {
        const spec = {
          spec: {
            host: 'swagger.io',
            basePath: '/v1',
            paths: {
              '/pet/{id}': {
                parameters: [
                  {
                    name: 'id',
                    in: 'path',
                    type: 'number',
                    required: true
                  }
                ],
                get: {
                  operationId: 'getPetsById',
                  parameters: [
                    {
                      name: 'test',
                      in: 'query',
                      type: 'number'
                    },
                    {
                      name: 'id',
                      in: 'query',
                      type: 'number',
                    }
                  ],
                }
              }
            }
          }
        }

        const resultSpec = normalizeSwagger(spec)
        const warnSpy = expect.spyOn(console, 'warn')
        const req = buildRequest({spec: resultSpec.spec, operationId: 'getPetsById', parameters: {id: 123, test: 567}})
        expect(req).toEqual({
          url: 'http://swagger.io/v1/pet/123?test=567&id=123',
          headers: {},
          credentials: 'same-origin',
          method: 'GET'
        })
        expect(warnSpy.calls.length).toEqual(2)
      })

      it('should encode path parameter', function () {
        const spec = {
          host: 'swagger.io',
          basePath: '/v1',
          paths: {
            '/{id}': {
              delete: {
                operationId: 'deleteMe',
                parameters: [{
                  in: 'path',
                  name: 'id',
                  type: 'string',
                  required: true
                }]
              }
            }
          }
        }

        const req = buildRequest({spec, operationId: 'deleteMe', parameters: {id: 'foo/bar'}})

        expect(req).toEqual({
          url: 'http://swagger.io/v1/foo%2Fbar',
          method: 'DELETE',
          credentials: 'same-origin',
          headers: { }
        })
      })
    })
  })

  describe('formData', function () {
    const spec = {
      host: 'swagger.io',
      basePath: '/v1',
      paths: {
        '/one': {
          post: {
            operationId: 'postMe',
            parameters: [{
              name: 'petId',
              in: 'formData',
              type: 'string'
            }]
          }
        }
      }
    }

    it('should generate a request with application/x-www-form-urlencoded', function () {
      const req = buildRequest({spec,
        requestContentType: 'application/x-www-form-urlencoded',
        operationId: 'postMe',
        parameters: {petId: 'id'}})

      expect(req).toEqual({
        url: 'http://swagger.io/v1/one',
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'petId=id'
      })
    })
  })
})
