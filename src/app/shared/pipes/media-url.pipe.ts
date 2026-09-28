import { Pipe, PipeTransform } from "@angular/core";
import { environment } from "environments/environment";
import { resolveMediaUrl } from "app/shared/common";

/**
 * Usage:
 *   {{ path | mediaUrl }}
 *   {{ path | mediaUrl:'upload-files' }}
 *   {{ path | mediaUrl:'' }}  // no folder, just base uploadPath when relative
 */
@Pipe({
  name: "mediaUrl",
  standalone: false,
})
export class MediaUrlPipe implements PipeTransform {
  transform(
    value: string | string[] | null | undefined,
    folder: string = "upload-files",
  ): string {
    return resolveMediaUrl(value, {
      basePath: environment.uploadPath,
      folder: folder || undefined,
    });
  }
}
