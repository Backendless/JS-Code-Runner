require('./helpers/global')

const { toMatcher } = require('../lib/util/file')

describe('glob toMatcher', function() {
  it('should match files by wildcard extension pattern', function() {
    const matcher = toMatcher('**/*.js')

    expect(matcher('foo/bar.js')).to.be.true
    expect(matcher('test.js')).to.be.true
    expect(matcher('deep/nested/file.js')).to.be.true
    expect(matcher('foo/bar.txt')).to.be.false
    expect(matcher('foo/bar.json')).to.be.false
  })

  it('should match files in a specific directory', function() {
    const matcher = toMatcher('lib/**/*.js')

    expect(matcher('lib/index.js')).to.be.true
    expect(matcher('lib/util/file.js')).to.be.true
    expect(matcher('test/index.js')).to.be.false
    expect(matcher('lib/util/file.txt')).to.be.false
  })

  it('should match node_modules exclusion pattern', function() {
    const matcher = toMatcher('node_modules/**')

    expect(matcher('node_modules/foo/index.js')).to.be.true
    expect(matcher('node_modules/bar')).to.be.true
    expect(matcher('lib/index.js')).to.be.false
  })

  it('should match single-level wildcard', function() {
    const matcher = toMatcher('*.js')

    expect(matcher('index.js')).to.be.true
    expect(matcher('lib/index.js')).to.be.false
  })

  it('should match exact file name', function() {
    const matcher = toMatcher('README.md')

    expect(matcher('README.md')).to.be.true
    expect(matcher('readme.md')).to.be.false
    expect(matcher('lib/README.md')).to.be.false
  })

  it('should match brace expansion patterns', function() {
    const matcher = toMatcher('**/*.{js,json}')

    expect(matcher('index.js')).to.be.true
    expect(matcher('package.json')).to.be.true
    expect(matcher('deep/nested/config.json')).to.be.true
    expect(matcher('style.css')).to.be.false
  })

  it('should match single character wildcard', function() {
    const matcher = toMatcher('file?.js')

    expect(matcher('file1.js')).to.be.true
    expect(matcher('fileA.js')).to.be.true
    expect(matcher('file.js')).to.be.false
    expect(matcher('file12.js')).to.be.false
  })
})
