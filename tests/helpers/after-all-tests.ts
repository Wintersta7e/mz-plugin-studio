// A check over what every test of a suite did, such as how many cases they ran. Tests run in a
// shuffled order, so a test placed last that reads what the others counted can run first and
// see nothing; an `afterAll` runs after all of them instead. A run filtered by test name checks
// only what the tests it ran did.

// The `afterAll` listener: `problems` returns what is wrong once the suite's tests have run, and
// any problem fails the suite.
export function afterAllTests(problems: () => string[]): () => void {
  return () => {
    const found = problems()
    if (found.length > 0) throw new Error(found.join('; '))
  }
}
