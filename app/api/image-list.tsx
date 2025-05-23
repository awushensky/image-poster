import type { FileMetadata } from '@mjackson/file-storage';
import ImageFile from '~/components/image-details';
import type { Route } from "./+types/image-list";
import { fileStorage } from '~/image-storage.server';
import { useNavigate } from "react-router-dom";
import { Link } from 'react-router';

export async function loader({ request }: Route.LoaderArgs) {

  const url = new URL(request.url);
  const prefix = url.searchParams.get('prefix') || '';
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const cursor = url.searchParams.get('cursor') || undefined;

  return await fileStorage.list({
    cursor: cursor,
    prefix: prefix,
    limit: limit,
    includeMetadata: true
  });
}

export default function ImageList({ params, loaderData }: Route.ComponentProps) {
  let navigate = useNavigate();

  if (!loaderData || !loaderData.files) {
    return <div>No files found</div>;
  }

  return (
    <div>
      <h1>All files in the server</h1>
      {
        loaderData.files.map((file) => {
          const fileMetadata = file as FileMetadata;
          return <ImageFile file={fileMetadata} />
        })
      }
      {
        loaderData.cursor && <Link to={{
          search: `?limit=${params.limit}&cursor=${loaderData.cursor}`,
        }}>Next</Link>
      }
      <div onClick={() => navigate(-1)}>Back</div>
    </div>
  );
}
