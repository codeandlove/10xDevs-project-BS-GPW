# AI Rules for {{project-name}}

{{project-description}}

## FRONTEND

### Guidelines for REACT

#### REACT_CODING_STANDARDS

- Use functional components with hooks instead of class components
- Implement React.memo() for expensive components that render often with the same props
- Utilize React.lazy() and Suspense for code-splitting and performance optimization
- Use the useCallback hook for event handlers passed to child components to prevent unnecessary re-renders
- Prefer useMemo for expensive calculations to avoid recomputation on every render
- Implement useId() for generating unique IDs for accessibility attributes
- Use the new use hook for data fetching in React 19+ projects
- Leverage Server Components for {{data_fetching_heavy_components}} when using React with Next.js or similar frameworks
- Consider using the new useOptimistic hook for optimistic UI updates in forms
- Use useTransition for non-urgent state updates to keep the UI responsive

### Guidelines for ASTRO

#### ASTRO_CODING_STANDARDS

- Use Astro components (.astro) for static content and layout
- Implement framework components in {{framework_name}} only when interactivity is needed
- Leverage View Transitions API for smooth page transitions
- Use content collections with type safety for blog posts, documentation, etc.
- Implement middleware for request/response modification
- Use image optimization with the Astro Image integration
- Leverage Server Endpoints for API routes
- Implement hybrid rendering with server-side rendering where needed
- Use Astro.cookies for server-side cookie management
- Leverage import.meta.env for environment variables

#### ASTRO_ISLANDS

- Use client:visible directive for components that should hydrate when visible in viewport
- Implement shared state with nanostores instead of prop drilling between islands
- Use content collections for type-safe content management of structured content
- Leverage client:media directive for components that should only hydrate at specific breakpoints
- Implement partial hydration strategies to minimize JavaScript sent to the client
- Use client:only for components that should never render on the server
- Leverage client:idle for non-critical UI elements that can wait until the browser is idle
- Implement client:load for components that should hydrate immediately
- Use Astro's transition:\* directives for view transitions between pages
- Leverage props for passing data from Astro to framework components

### Guidelines for STYLING

#### TAILWIND

- Use the @layer directive to organize styles into components, utilities, and base layers
- Implement Just-in-Time (JIT) mode for development efficiency and smaller CSS bundles
- Use arbitrary values with square brackets (e.g., w-[123px]) for precise one-off designs
- Leverage the @apply directive in component classes to reuse utility combinations
- Implement the Tailwind configuration file for customizing theme, plugins, and variants
- Use component extraction for repeated UI patterns instead of copying utility classes
- Leverage the theme() function in CSS for accessing Tailwind theme values
- Implement dark mode with the dark: variant
- Use responsive variants (sm:, md:, lg:, etc.) for adaptive designs
- Leverage state variants (hover:, focus:, active:, etc.) for interactive elements

### Guidelines for ACCESSIBILITY

#### ARIA

- Use ARIA landmarks to identify regions of the page (main, navigation, search, etc.)
- Apply appropriate ARIA roles to custom interface elements that lack semantic HTML equivalents
- Set aria-expanded and aria-controls for expandable content like accordions and dropdowns
- Use aria-live regions with appropriate politeness settings for dynamic content updates
- Implement aria-hidden to hide decorative or duplicative content from screen readers
- Apply aria-label or aria-labelledby for elements without visible text labels
- Use aria-describedby to associate descriptive text with form inputs or complex elements
- Implement aria-current for indicating the current item in a set, navigation, or process
- Avoid redundant ARIA that duplicates the semantics of native HTML elements
- Apply aria-invalid and appropriate error messaging for form validation in {{form_validation}}

#### ACCESSIBILITY_TESTING

- Test keyboard navigation to verify all interactive elements are operable without a mouse
- Verify screen reader compatibility with NVDA, JAWS, and VoiceOver for {{critical_user_journeys}}
- Use automated testing tools like Axe, WAVE, or Lighthouse to identify common accessibility issues
- Check color contrast using tools like Colour Contrast Analyzer for all text and UI components
- Test with page zoomed to 200% to ensure content remains usable and visible
- Perform manual accessibility audits using WCAG 2.2 checklist for key user flows
- Test with voice recognition software like Dragon NaturallySpeaking for voice navigation
- Validate form inputs have proper labels, instructions, and error handling mechanisms
- Conduct usability testing with disabled users representing various disability types
- Implement accessibility unit tests for UI components to prevent regression

#### MOBILE_ACCESSIBILITY

- Ensure touch targets are at least 44 by 44 pixels for comfortable interaction on mobile devices
- Implement proper viewport configuration to support pinch-to-zoom and prevent scaling issues
- Design layouts that adapt to both portrait and landscape orientations without loss of content
- Support both touch and keyboard navigation for hybrid devices with {{input_methods}}
- Ensure interactive elements have sufficient spacing to prevent accidental activation
- Test with mobile screen readers like VoiceOver (iOS) and TalkBack (Android)
- Design forms that work efficiently with on-screen keyboards and autocomplete functionality
- Implement alternatives to complex gestures that require fine motor control
- Ensure content is accessible when device orientation is locked for users with fixed devices
- Provide alternatives to motion-based interactions for users with vestibular disorders

#### WCAG_PERCEIVABLE

- Provide text alternatives for non-text content including images, icons, and graphics with appropriate alt attributes
- Ensure pre-recorded audio-visual content has captions, audio descriptions, and transcripts for {{media_content}}
- Maintain minimum contrast ratios of 4.5:1 for normal text and 3:1 for large text and UI components
- Enable content to be presented in different ways without losing information or structure when zoomed or resized
- Avoid using color alone to convey information; pair with text, patterns, or icons for {{status_indicators}}
- Provide controls to pause, stop, or hide any moving, blinking, or auto-updating content
- Ensure text can be resized up to 200% without loss of content or functionality in {{responsive_layouts}}
- Use responsive design that adapts to different viewport sizes and zoom levels without horizontal scrolling
- Enable users to customize text spacing (line height, paragraph spacing, letter/word spacing) without breaking layouts

#### WCAG_OPERABLE

- Make all functionality accessible via keyboard with visible focus indicators for {{interactive_elements}}
- Avoid keyboard traps where focus cannot move away from a component via standard navigation
- Provide mechanisms to extend, adjust, or disable time limits if present in {{timed_interactions}}
- Avoid content that flashes more than three times per second to prevent seizure triggers
- Implement skip navigation links to bypass blocks of repeated content across pages
- Use descriptive page titles, headings, and link text that indicate purpose and destination
- Ensure focus order matches the visual and logical sequence of information presentation
- Support multiple ways to find content (search, site map, logical navigation hierarchy)
- Allow pointer gesture actions to be accomplished with a single pointer without path-based gestures
- Implement pointer cancellation to prevent unintended function activation, especially for {{critical_actions}}

#### WCAG_UNDERSTANDABLE

- Specify the human language of the page and any language changes using lang attributes
- Ensure components with the same functionality have consistent identification and behavior across {{application_sections}}
- Provide clear labels, instructions, and error messages for user inputs and {{form_elements}}
- Implement error prevention for submissions with legal or financial consequences (confirmation, review, undo)
- Make navigation consistent across the site with predictable patterns for menus and interactive elements
- Ensure that receiving focus or changing settings does not automatically trigger unexpected context changes
- Design context-sensitive help for complex interactions including validated input formats
- Use clear language and define unusual terms, abbreviations, and jargon for {{domain_specific_content}}
- Provide visual and programmatic indication of current location within navigation systems

#### WCAG_ROBUST

- Use valid, well-formed markup that follows HTML specifications for {{document_structure}}
- Provide name, role, and value information for all user interface components
- Ensure custom controls and interactive elements maintain compatibility with assistive technologies
- Implement status messages that can be programmatically determined without receiving focus
- Use semantic HTML elements that correctly describe the content they contain (buttons, lists, headings, etc.)
- Validate code against technical specifications to minimize compatibility errors
- Test with multiple browsers and assistive technologies for cross-platform compatibility
- Avoid deprecated HTML elements and attributes that may not be supported in future technologies

## DATABASE

### Guidelines for SQL

#### POSTGRES

- Use connection pooling to manage database connections efficiently
- Implement JSONB columns for semi-structured data instead of creating many tables for {{flexible_data}}
- Use materialized views for complex, frequently accessed read-only data

## DEVOPS

### Guidelines for CI_CD

#### GITHUB_ACTIONS

- Check if `package.json` exists in project root and summarize key scripts
- Check if `.nvmrc` exists in project root
- Check if `.env.example` exists in project root to identify key `env:` variables
- Always use terminal command: `git branch -a | cat` to verify whether we use `main` or `master` branch
- Always use `env:` variables and secrets attached to jobs instead of global workflows
- Always use `npm ci` for Node-based dependency setup
- Extract common steps into composite actions in separate files
- Once you're done, as a final step conduct the following: for each public action always use <tool>"Run Terminal"</tool> to see what is the most up-to-date version (use only major version) - extract tag_name from the response:
- `bash curl -s https://api.github.com/repos/{owner}/{repo}/releases/latest `

## TESTING

### Guidelines for E2E

#### PLAYWRIGHT

- Initialize configuration only with Chromium/Desktop Chrome browser
- Use browser contexts for isolating test environments
- Implement the Page Object Model for maintainable tests
- Use locators for resilient element selection
- Leverage API testing for backend validation
- Implement visual comparison with expect(page).toHaveScreenshot()
- Use the codegen tool for test recording
- Leverage trace viewer for debugging test failures
- Implement test hooks for setup and teardown
- Use expect assertions with specific matchers
- Leverage parallel execution for faster test runs
