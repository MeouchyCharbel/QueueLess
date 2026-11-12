import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
// Adds matchers like toBeDisabled() and toBeInTheDocument() to expect().
import '@testing-library/jest-dom/vitest'

// Remove what each test rendered, so the next test starts from an empty page.
afterEach(cleanup)
