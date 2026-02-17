/**
 * Test author tags for identifying test case ownership.
 *
 * Used in test decorators to track which team member authored each test.
 */
export enum Author {
   PRANTO = '@Pranto',
}

/**
 * Test module tags for categorizing test cases by feature area.
 */
export enum Module {
   AUTHENTICATION = '@Authentication',
   ANALYSIS_FLOW = '@AnalysisFlow',

}