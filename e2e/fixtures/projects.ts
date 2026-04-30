// Layr MongoDB store format:
// - Primary identifier 'id' is mapped to '_id' in MongoDB
// - Component type is stored as '__component'
// - References to other components use {__component: 'TypeName', _id: 'cuid-value'}
// - IDs are CUIDs (e.g., 'ck41vli1z00013h5xx1esffyn')

export function createProjectDocument(ownerId: string) {
  return {
    _id: 'ck000test0000project0001',
    __component: 'Project',
    slug: 'realworld',
    name: 'RealWorld',
    description: 'The mother of all demo apps',
    headline: 'The mother of all demo apps',
    subheading:
      'See how the exact same Medium.com clone is built using different frontends and backends.',
    logo: {
      normalURL: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
      narrowURL: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
      height: 35,
      offsetY: 0,
    },
    screenshot: {
      normalURL: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
      narrowURL: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
      height: 200,
    },
    websiteURL: 'https://realworld.io/',
    createURL: 'https://realworld.io/docs',
    demoURL: 'https://demo.realworld.io/',
    repositoryURL: 'https://github.com/gothinkster/realworld',
    categories: ['frontend', 'backend', 'fullstack'],
    status: 'available',
    numberOfImplementations: 0,
    owner: {__component: 'User', _id: ownerId},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
