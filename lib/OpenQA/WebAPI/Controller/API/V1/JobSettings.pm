# Copyright 2022 SUSE LLC
# SPDX-License-Identifier: GPL-2.0-or-later

package OpenQA::WebAPI::Controller::API::V1::JobSettings;
use Mojo::Base 'Mojolicious::Controller', -signatures;

=over 4

=item jobs()

Filters jobs based on a single setting key/value pair.

  openqa-cli api job_settings/jobs key="*_TEST_ISSUES" list_value=39911
  openqa-cli api job_settings/jobs key="*" list_value=39911

=item C<key>

The setting key to filter by. It accepts a string or a glob of a job variable.
Some variables are not stored and they can not be used.

=item C<list_value>

The value to match for the given key. This can be a string without special characters.

=item Returns

On success, returns an array of the matched job ids. The results rely on
C<{misc_limits}{job_settings_max_recent_jobs}>.

=back

=cut

sub jobs ($self) {
    # Validation in openapi.json via parameters
    my $key = $self->param('key');
    my $list_value = $self->param('list_value');
    my $jobs = $self->schema->resultset('JobSettings')->jobs_for_setting({key => $key, list_value => $list_value});
    $self->render(json => {jobs => $jobs});
}

1;
