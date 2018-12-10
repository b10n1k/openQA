# Copyright (C) 2017-2018 SUSE LLC
#
# This program is free software; you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation; either version 2 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License along
# with this program; if not, see <http://www.gnu.org/licenses/>.

package OpenQA::Parser::Format::Base;
use Mojo::Base 'OpenQA::Parser';

use Carp 'croak';
use OpenQA::Parser::Result::Test;
use OpenQA::Parser::Result;
use OpenQA::Parser::Result::Output;
use OpenQA::Parser::Result::OpenQA;

has include_results => 1;
has generated_tests => sub { OpenQA::Parser::Result::OpenQA::Results->new };    #testsuites
has generated_tests_results =>
  sub { OpenQA::Parser::Result::OpenQA::Results->new }; #testsuites results - when include_result is set it includes also the test.
has generated_tests_output => sub { OpenQA::Parser::Result::OpenQA::Results->new };    #testcase results
has generated_tests_extra  => sub { OpenQA::Parser::Result::OpenQA::Results->new };    # tests extra data.

sub parse { shift() }                                                                  # Do nothing here.

sub _write_all {
    my ($self, $res, $dir) = @_;
    path($dir)->make_path unless -d $dir;
    $self->$res->each(sub { $_->write($dir) });
    $self;
}

sub write_output {
    my ($self, $dir) = @_;
    croak "You need to specify a directory" unless $dir;
    $self->_write_all(generated_tests_output => $dir);
}

sub write_test_result {
    my ($self, $dir) = @_;
    croak "You need to specify a directory" unless $dir;
    $self->_write_all(generated_tests_results => $dir);
}

sub _add_test   { shift->generated_tests->add(OpenQA::Parser::Result::Test->new(@_)) }
sub _add_result { shift->generated_tests_results->add(OpenQA::Parser::Result->new(@_)) }
sub _add_output { shift->generated_tests_output->add(OpenQA::Parser::Result::Output->new(@_)) }

*results = \&generated_tests_results;
*tests   = \&generated_tests;
*outputs = \&generated_tests_output;
*extra   = \&generated_tests_extra;


=encoding utf-8

=head1 NAME

OpenQA::Parser::Format::Base - Baseclass for reading test formats

=head1 SYNOPSIS

    # OOP Interface
    use OpenQA::Parser::Format::Base;

    my $parser = OpenQA::Parser::Format::Base->new();

    ....

    # Alternative interface
    use OpenQA::Parser qw(parser p);

    # Generates an instance of OpenQA::Parser::Format::Base
    my $parser = p('Base');

=head1 DESCRIPTION

OpenQA::Parser::Format::Base is the parser format base object. Specific file format to be parsed have their own
parser Class that must inherit this one.

=head1 ATTRIBUTES

OpenQA::Parser::Format::Base inherits all attributes from L<OpenQA::Parser>
and implements the following new ones:

=head2 results()

    use OpenQA::Parser 'parser';

    my $parser = parser('Base');

    my $res = $parser->results;

    $res->each->( sub {
        my ($result) = @_;
        print $result->name."\n";
    })

See specific format implementations for the exact definition.
The base object won't parse any type of data.
By default it returns a L<OpenQA::Parser::Results> object that represent
a collection of results of type L<OpenQA::Parser::Result::OpenQA>.
This is usually the most used collection since represent the parsing results.
Note, results can be of any kind from the base object perspective and they are not breaking serialization.

=head2 tests()

    use OpenQA::Parser 'parser';

    my $parser = parser( LTP => 'file.json' );

    my $res = $parser->tests;

    $tests->each->( sub {
        my ($test) = @_;
        print $test->name."\n";
    })

See specific format implementations for the exact definition.
The base object won't parse any type of data.
By default it returns a L<OpenQA::Parser::Results> object that represent
a collection of tests of type L<OpenQA::Parser::Result::Test>.
Note, tests can be of any kind from the base object perspective and they are not breaking serialization.

=head2 outputs()

    use OpenQA::Parser 'parser';

    my $parser = parser( LTP => 'file.json' );

    my $res = $parser->outputs;

    $outputs->each->( sub {
        my ($output) = @_;
        print $output->file."\n";
        print $output->content."\n";
    })

See specific format implementations for the exact definition.
The base object won't parse any type of data.
By default it returns a L<OpenQA::Parser::Results> object that represent
a collection of outputs of type L<OpenQA::Parser::Result::Output>.
They contain usually the output (if any) of specific tests.
Note, outputs can be of any kind from the base object perspective and they are not breaking serialization.

=head2 extra()

    use OpenQA::Parser 'parser';

    my $parser = parser( LTP => 'file.json' );

    my $res = $parser->extra;

    $extras->each->( sub {
        my ($extra) = @_;
        print $extra->environment."\n";
    })


See specific format implementations for the exact definition.
The base object won't parse any type of data.
By default it returns a L<OpenQA::Parser::Results> object that represent a collection of extras data.
Note, extras can be of any kind from the base object perspective and they are not breaking serialization.

=head1 METHODS

OpenQA::Parser::Format::Base inherits all methods from L<OpenQA::Parser>
and implements the following new ones:

=head2 write_test_result()

    use OpenQA::Parser qw(parser);

    my $p = parser('LTP')->parse($json_content);

    use OpenQA::Parser::Format::LTP;
    my $p = OpenQA::Parser::Format::LTP->new()->parse('file.json');

    $p->write_test_result($dir);

It will write all the test results as JSON in the specified folder.
It merely calls write() on each element of the C<results()> collection.

=head2 write_output()

    use OpenQA::Parser qw(parser);

    my $p = parser('LTP')->parse($json_content);

    use OpenQA::Parser::Format::LTP;
    my $p = OpenQA::Parser::Format::LTP->new()->parse('file.json');

    $p->write_output($dir);

It will write all the test outputs (as long block of text) in the specified folder.
It merely calls write() on each element of the C<output()> collection.

=cut

1;
